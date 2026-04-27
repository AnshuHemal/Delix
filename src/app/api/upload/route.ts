/**
 * POST /api/upload — upload a file and store it in the File model
 *
 * Accepts multipart/form-data with:
 *   file           — the file to upload (required)
 *   conversationId — optional, links the file to a conversation
 *
 * Returns: { url, fileName, fileSize, mimeType }
 *
 * Since no external storage (S3/R2) is configured, the file is stored
 * as a base64 data URL in the File.url field.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const fileField = formData.get("file");
  if (!fileField || !(fileField instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const file = fileField as File;

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds the 25 MB limit" },
      { status: 413 }
    );
  }

  const conversationId = formData.get("conversationId");
  const conversationIdStr =
    typeof conversationId === "string" && conversationId.length > 0
      ? conversationId
      : undefined;

  // Read file as Buffer and encode as base64 data URL
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "application/octet-stream";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  // Persist to File model
  const fileRecord = await prisma.file.create({
    data: {
      name: file.name,
      url: dataUrl,
      size: file.size,
      mimeType,
      source: "CONVERSATION",
      uploadedById: session.user.id,
      ...(conversationIdStr ? { conversationId: conversationIdStr } : {}),
    },
  });

  return NextResponse.json({
    url: fileRecord.url,
    fileName: fileRecord.name,
    fileSize: fileRecord.size,
    mimeType: fileRecord.mimeType,
  });
}
