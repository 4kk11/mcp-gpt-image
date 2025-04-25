import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import OpenAI, { toFile } from "openai";

enum ToolName {
  GENERATE_IMAGE = "generate_image",
  EDIT_IMAGE = "edit_image",
}

const GenerateImageSchema = z.object({
  prompt: z.string().describe("テキストプロンプト"),
  size: z
    .enum(["1024x1024", "1536x1024", "1024x1536", "auto"])
    .default("auto")
    .describe("出力画像サイズ"),
});

const EditImageSchema = z.object({
  image: z.string().describe("編集する画像のファイルパス"),
  prompt: z.string().describe("編集内容を説明するテキストプロンプト"),
});

// 画像保存用のディレクトリパスを環境変数から取得
const IMAGES_DIR = process.env.IMAGES_DIR
  ? path.resolve(process.env.IMAGES_DIR)
  : path.join(process.cwd(), "temp");

// 保存用ディレクトリが存在しない場合は作成
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export const createServer = async () => {
  const server = new Server(
    {
      name: "mcp-gpt-image",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // OpenAIクライアントの初期化
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  const client = new OpenAI();

  // ツール一覧の取得ハンドラー
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [
      {
        name: ToolName.GENERATE_IMAGE,
        description: "テキストプロンプトから画像を生成",
        inputSchema: zodToJsonSchema(GenerateImageSchema) as Tool["inputSchema"],
      },
      {
        name: ToolName.EDIT_IMAGE,
        description: "既存画像を編集",
        inputSchema: zodToJsonSchema(EditImageSchema) as Tool["inputSchema"],
      },
    ];

    return { tools };
  });

  // ツールの実行ハンドラー
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === ToolName.GENERATE_IMAGE) {
      const validatedArgs = GenerateImageSchema.parse(args);
      const { prompt, size } = validatedArgs;

      try {
        const response = await client.images.generate({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: size
        });

        if (!response?.data?.[0]?.b64_json) {
          throw new McpError(500, "画像生成に失敗しました: レスポンスデータが不正です");
        }

        // 一時ファイルとして保存
        const timestamp = new Date().getTime();
        const filename = `generated_${timestamp}.png`;
        const filepath = path.join(IMAGES_DIR, filename);
        
        // Base64データをバッファに変換
        const imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
        
        // 元のサイズで保存
        fs.writeFileSync(filepath, imageBuffer);

        // 256x256にリサイズ
        const resizedImageBuffer = await sharp(imageBuffer)
          .resize(256, 256, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toBuffer();

        return {
          content: [
            {
              type: "text",
              text: filepath,
              mimeType: "image/png",
            },
            {
              type: "image",
              data: resizedImageBuffer.toString('base64'),
              mimeType: "image/png",
            }
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Image generation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (name === ToolName.EDIT_IMAGE) {
      const validatedArgs = EditImageSchema.parse(args);
      const { image, prompt } = validatedArgs;

      try {
        // ファイルパスから画像を読み込む
        if (!fs.existsSync(image)) {
          throw new McpError(ErrorCode.InternalError, "指定された画像ファイルが存在しません");
        }

        const imageFile = await toFile(
          fs.createReadStream(image),
          path.basename(image),
          { type: 'image/png' }
        );

        const response = await client.images.edit({
          model: "gpt-image-1",
          image: imageFile,
          prompt,
          n: 1
        });

        if (!response?.data?.[0]?.b64_json) {
          throw new McpError(500, "画像編集に失敗しました: レスポンスデータが不正です");
        }

        // 一時ファイルとして保存
        const timestamp = new Date().getTime();
        const filename = `edited_${timestamp}.png`;
        const filepath = path.join(IMAGES_DIR, filename);
        
        // Base64データをバッファに変換
        const imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
        
        // 元のサイズで保存
        fs.writeFileSync(filepath, imageBuffer);

        // 256x256にリサイズ
        const resizedImageBuffer = await sharp(imageBuffer)
          .resize(256, 256, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toBuffer();

        return {
          content: [
            {
              type: "text",
              text: filepath,
              mimeType: "image/png",
            },
            {
              type: "image",
              data: resizedImageBuffer.toString('base64'),
              mimeType: "image/png",
            }
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Image editing failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  });

  return { server };
};