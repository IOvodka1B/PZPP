import { getCourses } from "@/app/actions/courseActions";
import CourseList from "@/components/features/courses/CourseList";

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Kursy</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzaj kursami, modułami i lekcjami. Wszystkie zmiany zapisują się w
          bazie danych.
        </p>
      </header>

      <CourseList initialCourses={courses} />
    </section>
  );
}

