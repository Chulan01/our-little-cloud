import { NextResponse, type NextRequest } from "next/server";
import { requireCouple } from "@/lib/auth/guard";
import { uploadPhoto } from "@/lib/utils/storage";
import { photoFileSchema } from "@/lib/validations/shared";

export async function POST(request: NextRequest) {
  const { coupleId } = await requireCouple();
  const formData = await request.formData();
  const file = formData.get("file");
  const entity = formData.get("entity");
  const entityId = formData.get("entityId");

  const parsed = photoFileSchema.safeParse(file);
  if (!parsed.success || (entity !== "memories" && entity !== "capsules") || typeof entityId !== "string") {
    return NextResponse.json({ error: "Некорректная загрузка." }, { status: 400 });
  }

  const uploaded = await uploadPhoto({ coupleId, entity, entityId, file: parsed.data });
  return NextResponse.json(uploaded);
}
