import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function StudentCoursePage({ params }) {
  const { courseId } = await params

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: { orderBy: { order: 'asc' } },
        },
      },
    },
  })

  if (!course || !course.isPublished) {
    notFound()
  }

  const lessonsTotal = course.modules.reduce((n, m) => n + m.lessons.length, 0)

  return (
    <div className="space-y-6">
      <Link href="/student" className="text-sm text-primary underline-offset-4 hover:underline">
        ← Moje kursy
      </Link>
      <div>
        <h1 className="text-3xl font-bold text-[#0f172a]">{course.title}</h1>
        {course.description ? (
          <p className="mt-2 max-w-3xl text-muted-foreground">{course.description}</p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          {lessonsTotal} lekcji w {course.modules.length} modułach
        </p>
      </div>
    </div>
  )
}
