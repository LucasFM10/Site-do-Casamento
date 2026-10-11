import { requireAdminPocketBase } from "@/utils/pocketbase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const pb = await requireAdminPocketBase();
    const record = await pb.collection("tercos").getOne(params.id, {
      fields: "id,collectionId,collectionName,foto",
      requestKey: null,
    });

    if (!record.foto) {
      return new NextResponse(null, { status: 404 });
    }

    const fileToken = await pb.files.getToken();
    const response = await fetch(
      pb.files.getURL(record, record.foto, { token: fileToken }),
      { cache: "no-store" },
    );

    if (!response.ok || !response.body) {
      return new NextResponse(null, { status: response.status || 502 });
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 401 });
  }
}
