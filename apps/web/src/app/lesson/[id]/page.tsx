import { notFound } from "next/navigation";
import { LESSONS, lessonById } from "@/mocks/learning";
import { LessonPlayer } from "./player";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ id: l.id }));
}

export default async function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  const lesson = lessonById(id);
  if (!lesson) notFound();
  return <LessonPlayer lessonId={lesson.id} />;
}
