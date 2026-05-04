"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/rbac";

function hasFunnelModels() {
  return Boolean(
    prisma?.funnel &&
      prisma?.funnelStep &&
      (prisma?.aBTest || prisma?.abTest) &&
      (prisma?.aBVariant || prisma?.abVariant)
  );
}

function assertFunnelModelsAvailable() {
  if (hasFunnelModels()) return;
  throw new Error(
    "Modele lejkow nie sa jeszcze dostepne w Prisma Client. Uruchom: npx prisma db push (lub migrate dev) oraz npx prisma generate."
  );
}

const FUNNEL_INCLUDE = {
  steps: {
    orderBy: { order: "asc" },
    include: {
      landingPage: true,
      abTests: {
        orderBy: { createdAt: "desc" },
        include: {
          variants: {
            orderBy: { name: "asc" },
            include: { landingPage: true },
          },
        },
      },
    },
  },
};

const TEST_INCLUDE = {
  variants: {
    orderBy: { name: "asc" },
    include: { landingPage: true },
  },
  funnelStep: {
    include: { funnel: { select: { id: true, slug: true, ownerId: true } } },
  },
  course: { select: { id: true, authorId: true, title: true } },
};

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidateSalesPageExperimentDashboards(testLike) {
  if (testLike?.funnelStepId) {
    if (testLike?.funnelStep?.funnel?.id) {
      revalidatePath(`/dashboard/lejki/${testLike.funnelStep.funnel.id}`);
    }
    return;
  }
  if (testLike?.courseId) {
    revalidatePath(`/dashboard/kursy/${testLike.courseId}`);
    return;
  }
}

async function fetchOwnedAbTest(abTestDelegate, auth, testId) {
  return abTestDelegate.findFirst({
    where: {
      id: testId,
      OR: [
        { funnelStep: { funnel: { ownerId: auth.userId } } },
        { course: { authorId: auth.userId } },
      ],
    },
    include: TEST_INCLUDE,
  });
}

function normalizeVariantWeights(variants) {
  if (!Array.isArray(variants) || variants.length < 2) {
    throw new Error("Test A/B wymaga minimum 2 wariantow.");
  }

  const sanitized = variants.map((variant, index) => ({
    ...variant,
    name: String(variant.name || `Wariant ${index + 1}`).trim(),
    landingPageId: String(variant.landingPageId || "").trim(),
    trafficWeight: Number(variant.trafficWeight ?? 0),
  }));

  if (sanitized.some((variant) => !variant.landingPageId || !variant.name)) {
    throw new Error("Kazdy wariant testu musi miec nazwe i strone docelowa.");
  }
  const uniqueLandingIds = new Set(sanitized.map((variant) => variant.landingPageId));
  if (uniqueLandingIds.size !== sanitized.length) {
    throw new Error("Warianty w jednym tescie musza wskazywac rozne strony.");
  }

  const totalWeight = sanitized.reduce(
    (sum, variant) => sum + Math.max(0, variant.trafficWeight),
    0
  );

  if (totalWeight <= 0) {
    throw new Error("Suma trafficWeight musi byc wieksza od 0.");
  }

  return sanitized.map((variant) => ({
    name: variant.name,
    landingPageId: variant.landingPageId,
    trafficWeight: Math.round(
      (Math.max(0, variant.trafficWeight) / totalWeight) * 100
    ),
  }));
}

export async function getFunnelsWithDetails() {
  if (!hasFunnelModels()) return [];
  const auth = await requireCreator();
  if (!auth.ok) return [];

  return prisma.funnel.findMany({
    where: { ownerId: auth.userId },
    orderBy: { createdAt: "desc" },
    include: FUNNEL_INCLUDE,
  });
}

export async function getFunnelById(funnelId) {
  if (!funnelId) return null;
  if (!hasFunnelModels()) return null;
  const auth = await requireCreator();
  if (!auth.ok) return null;

  return prisma.funnel.findFirst({
    where: { id: funnelId, ownerId: auth.userId },
    include: FUNNEL_INCLUDE,
  });
}

export async function getLandingPagesForVariants() {
  const auth = await requireCreator();
  if (!auth.ok) return [];

  return prisma.landingPage.findMany({
    where: { isActive: true, authorId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, courseId: true },
  });
}

export async function getCoursesForABTests() {
  const auth = await requireCreator();
  if (!auth.ok) return [];
  return prisma.course.findMany({
    where: { authorId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
}

export async function getLandingPagesForCourse(courseId) {
  const auth = await requireCreator();
  if (!auth.ok || !courseId) return [];
  return prisma.landingPage.findMany({
    where: {
      isActive: true,
      authorId: auth.userId,
      courseId,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, courseId: true },
  });
}

export async function createFunnel(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const status = String(formData.get("status") || "DRAFT");

  if (!name || !slug) {
    throw new Error("Nazwa i slug sa wymagane.");
  }

  await prisma.funnel.create({
    data: { name, slug, status, ownerId: auth.userId },
  });

  revalidatePath("/dashboard/lejki");
}

export async function updateFunnel(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const status = String(formData.get("status") || "DRAFT");

  if (!id || !name || !slug) {
    throw new Error("Brakuje wymaganych danych lejka.");
  }

  const updated = await prisma.funnel.updateMany({
    where: { id, ownerId: auth.userId },
    data: { name, slug, status },
  });

  if (updated.count === 0) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }

  revalidatePath("/dashboard/lejki");
  revalidatePath(`/dashboard/lejki/${id}`);
}

export async function deleteFunnel(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Brak id lejka.");

  const deleted = await prisma.funnel.deleteMany({
    where: { id, ownerId: auth.userId },
  });
  if (deleted.count === 0) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }
  revalidatePath("/dashboard/lejki");
}

export async function addFunnelStep(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const funnelId = String(formData.get("funnelId") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const stepType = String(formData.get("stepType") || "LANDING");
  const isRequired = parseBoolean(formData.get("isRequired"), true);
  const landingPageId = String(formData.get("landingPageId") || "").trim();
  const orderFromForm = Number(formData.get("order"));

  if (!funnelId || !name || !slug) {
    throw new Error("Brakuje wymaganych danych kroku.");
  }

  const funnel = await prisma.funnel.findFirst({
    where: { id: funnelId, ownerId: auth.userId },
    select: { id: true },
  });
  if (!funnel) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }

  const existingSteps = await prisma.funnelStep.findMany({
    where: { funnelId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const nextOrder = Number.isFinite(orderFromForm)
    ? Math.max(1, Math.trunc(orderFromForm))
    : existingSteps.length + 1;

  await prisma.$transaction(async (tx) => {
    await tx.funnelStep.updateMany({
      where: { funnelId, order: { gte: nextOrder } },
      data: { order: { increment: 1 } },
    });

    await tx.funnelStep.create({
      data: {
        funnelId,
        name,
        slug,
        stepType,
        isRequired,
        order: nextOrder,
        landingPageId: landingPageId || null,
      },
    });
  });

  revalidatePath(`/dashboard/lejki/${funnelId}`);
}

export async function updateFunnelStep(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const stepId = String(formData.get("stepId") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const stepType = String(formData.get("stepType") || "LANDING");
  const isRequired = parseBoolean(formData.get("isRequired"), true);
  const landingPageId = String(formData.get("landingPageId") || "").trim();

  if (!stepId || !name || !slug) {
    throw new Error("Brakuje danych kroku do edycji.");
  }

  const step = await prisma.funnelStep.findFirst({
    where: { id: stepId, funnel: { ownerId: auth.userId } },
    include: { funnel: { select: { id: true } } },
  });
  if (!step) throw new Error("Krok nie istnieje lub nie masz do niego dostepu.");

  const slugCollision = await prisma.funnelStep.findFirst({
    where: {
      funnelId: step.funnelId,
      slug,
      id: { not: step.id },
    },
    select: { id: true },
  });
  if (slugCollision) {
    throw new Error("Slug kroku musi byc unikalny w ramach lejka.");
  }

  await prisma.funnelStep.update({
    where: { id: step.id },
    data: {
      name,
      slug,
      stepType,
      isRequired,
      landingPageId: landingPageId || null,
    },
  });

  revalidatePath(`/dashboard/lejki/${step.funnelId}`);
}

export async function deleteFunnelStep(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const stepId = String(formData.get("stepId") || "");
  if (!stepId) throw new Error("Brak id kroku.");

  const step = await prisma.funnelStep.findFirst({
    where: { id: stepId, funnel: { ownerId: auth.userId } },
    select: { id: true, funnelId: true, order: true },
  });
  if (!step) throw new Error("Krok nie istnieje lub nie masz do niego dostepu.");

  await prisma.$transaction(async (tx) => {
    await tx.funnelStep.delete({ where: { id: step.id } });
    await tx.funnelStep.updateMany({
      where: { funnelId: step.funnelId, order: { gt: step.order } },
      data: { order: { decrement: 1 } },
    });
  });

  revalidatePath(`/dashboard/lejki/${step.funnelId}`);
}

export async function reorderFunnelSteps(funnelId, orderedStepIds) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  if (!funnelId || !Array.isArray(orderedStepIds) || orderedStepIds.length === 0) {
    throw new Error("Brakuje danych do zmiany kolejnosci krokow.");
  }

  const funnel = await prisma.funnel.findFirst({
    where: { id: funnelId, ownerId: auth.userId },
    select: { id: true },
  });
  if (!funnel) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }

  const existingSteps = await prisma.funnelStep.findMany({
    where: { funnelId },
    select: { id: true },
  });
  const existingIds = new Set(existingSteps.map((step) => step.id));
  if (
    existingSteps.length !== orderedStepIds.length ||
    orderedStepIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error("Niepoprawna lista krokow do zmiany kolejnosci.");
  }

  await prisma.$transaction(
    orderedStepIds.map((stepId, index) =>
      prisma.funnelStep.update({
        where: { id: stepId },
        data: { order: index + 1 },
      })
    )
  );

  revalidatePath(`/dashboard/lejki/${funnelId}`);
}

async function moveFunnelStep(formData, direction) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const funnelId = String(formData.get("funnelId") || "");
  const stepId = String(formData.get("stepId") || "");

  if (!funnelId || !stepId) {
    throw new Error("Brakuje danych do zmiany kolejnosci.");
  }

  const funnel = await prisma.funnel.findFirst({
    where: { id: funnelId, ownerId: auth.userId },
    select: { id: true },
  });
  if (!funnel) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }

  await prisma.$transaction(async (tx) => {
    const currentStep = await tx.funnelStep.findUnique({
      where: { id: stepId },
      select: { id: true, order: true, funnelId: true },
    });

    if (!currentStep) return;

    const targetOrder =
      direction === "up" ? currentStep.order - 1 : currentStep.order + 1;

    if (targetOrder < 1) return;

    const neighbor = await tx.funnelStep.findFirst({
      where: { funnelId: currentStep.funnelId, order: targetOrder },
      select: { id: true, order: true },
    });

    if (!neighbor) return;

    await tx.funnelStep.update({
      where: { id: currentStep.id },
      data: { order: neighbor.order },
    });

    await tx.funnelStep.update({
      where: { id: neighbor.id },
      data: { order: currentStep.order },
    });
  });

  revalidatePath(`/dashboard/lejki/${funnelId}`);
}

export async function moveFunnelStepUp(formData) {
  return moveFunnelStep(formData, "up");
}

export async function moveFunnelStepDown(formData) {
  return moveFunnelStep(formData, "down");
}

export async function createABTestForStep(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const targetType = String(formData.get("targetType") || "FUNNEL_STEP");
  const funnelId = String(formData.get("funnelId") || "");
  const funnelStepId = String(formData.get("funnelStepId") || "");
  const courseId = String(formData.get("courseId") || "");
  const name = String(formData.get("name") || "").trim();
  const status = String(formData.get("status") || "DRAFT");
  const winnerMetric = String(formData.get("winnerMetric") || "PURCHASE");
  const startsAtRaw = String(formData.get("startsAt") || "").trim();
  const endsAtRaw = String(formData.get("endsAt") || "").trim();
  const variantsPayload = String(formData.get("variants") || "[]");
  const startsAt = parseDate(startsAtRaw);
  const endsAt = parseDate(endsAtRaw);
  if (!name) throw new Error("Nazwa testu jest wymagana.");
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new Error("Data rozpoczecia musi byc wczesniejsza niz data zakonczenia.");
  }

  let parsedVariants;
  try {
    parsedVariants = JSON.parse(variantsPayload);
  } catch {
    throw new Error("Niepoprawny format wariantow.");
  }
  const variants = normalizeVariantWeights(parsedVariants);

  let resolvedStepId = null;
  let resolvedCourseId = null;
  if (targetType === "FUNNEL_STEP") {
    if (!funnelStepId) throw new Error("Brak kroku lejka dla testu.");
    const step = await prisma.funnelStep.findFirst({
      where: { id: funnelStepId, funnel: { ownerId: auth.userId } },
      select: { id: true, funnelId: true },
    });
    if (!step) throw new Error("Krok lejka nie istnieje lub nie masz do niego dostepu.");
    resolvedStepId = step.id;
  } else if (targetType === "COURSE_SALES_PAGE") {
    if (!courseId) throw new Error("Brak kursu dla testu.");
    const course = await prisma.course.findFirst({
      where: { id: courseId, authorId: auth.userId },
      select: { id: true },
    });
    if (!course) throw new Error("Kurs nie istnieje lub nie masz do niego dostepu.");
    resolvedCourseId = course.id;
  } else {
    throw new Error("Nieobslugiwany typ targetu testu.");
  }

  const landingIds = variants.map((variant) => variant.landingPageId);
  const landingPages = await prisma.landingPage.findMany({
    where: {
      id: { in: landingIds },
      authorId: auth.userId,
      isActive: true,
      ...(resolvedCourseId ? { courseId: resolvedCourseId } : {}),
    },
    select: { id: true },
  });
  if (landingPages.length !== landingIds.length) {
    throw new Error("Co najmniej jeden wariant wskazuje niedostepna strone.");
  }

  const abTestDelegate = prisma.aBTest ?? prisma.abTest;
  if (status === "ACTIVE") {
    if (resolvedStepId) {
      const funnelClash = await abTestDelegate.findFirst({
        where: { status: "ACTIVE", funnelStepId: resolvedStepId },
        select: { id: true },
      });
      if (funnelClash) {
        throw new Error("Na tym kroku lejka jest juz aktywny test A/B.");
      }
    }
    if (resolvedCourseId) {
      const courseClash = await abTestDelegate.findFirst({
        where: {
          status: "ACTIVE",
          targetType: "COURSE_SALES_PAGE",
          courseId: resolvedCourseId,
        },
        select: { id: true },
      });
      if (courseClash) {
        throw new Error("Dla tego kursu moze byc aktywny tylko jeden eksperyment strony.");
      }
    }
  }

  const created = await abTestDelegate.create({
    data: {
      targetType,
      funnelStepId: resolvedStepId,
      courseId: resolvedCourseId,
      name,
      status,
      winnerMetric,
      startsAt,
      endsAt,
      variants: {
        create: variants,
      },
    },
    include: TEST_INCLUDE,
  });

  if (created.funnelStep?.funnel?.id) {
    revalidatePath(`/dashboard/lejki/${created.funnelStep.funnel.id}`);
  } else if (funnelId) {
    revalidatePath(`/dashboard/lejki/${funnelId}`);
  }
  if (created.targetType === "COURSE_SALES_PAGE") {
    revalidateSalesPageExperimentDashboards(created);
  }
}

export async function updateABTest(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const testId = String(formData.get("testId") || "");
  const name = String(formData.get("name") || "").trim();
  const winnerMetric = String(formData.get("winnerMetric") || "PURCHASE");
  const startsAt = parseDate(String(formData.get("startsAt") || "").trim());
  const endsAt = parseDate(String(formData.get("endsAt") || "").trim());
  const status = String(formData.get("status") || "DRAFT");
  const winnerVariantId = String(formData.get("winnerVariantId") || "").trim();
  const variantsPayload = String(formData.get("variants") || "");

  if (!testId || !name) throw new Error("Brakuje danych testu do edycji.");
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new Error("Data rozpoczecia musi byc wczesniejsza niz data zakonczenia.");
  }

  const abTestDelegate = prisma.aBTest ?? prisma.abTest;
  const test = await fetchOwnedAbTest(abTestDelegate, auth, testId);
  if (!test) throw new Error("Test nie istnieje lub nie masz do niego dostepu.");

  if (status === "ACTIVE") {
    if (test.targetType === "FUNNEL_STEP" && test.funnelStepId) {
      const clash = await abTestDelegate.findFirst({
        where: { id: { not: testId }, status: "ACTIVE", funnelStepId: test.funnelStepId },
        select: { id: true },
      });
      if (clash) throw new Error("Na tym kroku lejka jest juz aktywny test.");
    } else if (test.targetType === "COURSE_SALES_PAGE" && test.courseId) {
      const clash = await abTestDelegate.findFirst({
        where: {
          id: { not: testId },
          status: "ACTIVE",
          targetType: "COURSE_SALES_PAGE",
          courseId: test.courseId,
        },
        select: { id: true },
      });
      if (clash) throw new Error("Dla tego kursu jest juz aktywny eksperyment.");
    }
  }

  await prisma.$transaction(async (tx) => {
    const txTestDelegate = tx.aBTest ?? tx.abTest;
    const txVariantDelegate = tx.aBVariant ?? tx.abVariant;

    await txTestDelegate.update({
      where: { id: testId },
      data: {
        name,
        status,
        winnerMetric,
        startsAt,
        endsAt,
        winnerVariantId: winnerVariantId || null,
      },
    });

    if (String(variantsPayload || "").trim().length > 0) {
      let parsedVariants;
      try {
        parsedVariants = JSON.parse(variantsPayload);
      } catch {
        throw new Error("Niepoprawny format wariantow.");
      }
      const normalized = normalizeVariantWeights(parsedVariants);
      await txVariantDelegate.deleteMany({ where: { abTestId: testId } });
      await txVariantDelegate.createMany({
        data: normalized.map((variant) => ({
          ...variant,
          abTestId: testId,
        })),
      });
    }
  });

  revalidateSalesPageExperimentDashboards(test);
  if (test.funnelStep?.funnel?.id) {
    revalidatePath(`/dashboard/lejki/${test.funnelStep.funnel.id}`);
  }
}

export async function setABTestStatus(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);
  const testId = String(formData.get("testId") || "");
  const status = String(formData.get("status") || "");
  if (!testId || !status) throw new Error("Brakuje danych zmiany statusu testu.");

  const abTestDelegate = prisma.aBTest ?? prisma.abTest;
  const test = await fetchOwnedAbTest(abTestDelegate, auth, testId);
  if (!test) throw new Error("Test nie istnieje lub nie masz do niego dostepu.");

  if (status === "ACTIVE") {
    if (test.targetType === "FUNNEL_STEP" && test.funnelStepId) {
      const clash = await abTestDelegate.findFirst({
        where: { id: { not: test.id }, status: "ACTIVE", funnelStepId: test.funnelStepId },
        select: { id: true },
      });
      if (clash) throw new Error("Na tym kroku lejka jest juz aktywny test.");
    } else if (test.targetType === "COURSE_SALES_PAGE" && test.courseId) {
      const clash = await abTestDelegate.findFirst({
        where: {
          id: { not: test.id },
          status: "ACTIVE",
          targetType: "COURSE_SALES_PAGE",
          courseId: test.courseId,
        },
        select: { id: true },
      });
      if (clash) throw new Error("Dla tego kursu jest juz aktywny eksperyment.");
    }
  }

  await abTestDelegate.update({ where: { id: test.id }, data: { status } });
  revalidateSalesPageExperimentDashboards(test);
  if (test.funnelStep?.funnel?.id) {
    revalidatePath(`/dashboard/lejki/${test.funnelStep.funnel.id}`);
  }
}

export async function deleteABTest(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const testId = String(formData.get("testId") || "");
  if (!testId) throw new Error("Brak id testu.");

  const abTestDelegate = prisma.aBTest ?? prisma.abTest;
  const test = await fetchOwnedAbTest(abTestDelegate, auth, testId);
  if (!test) throw new Error("Test nie istnieje lub nie masz do niego dostepu.");

  await abTestDelegate.delete({ where: { id: test.id } });
  revalidateSalesPageExperimentDashboards(test);
  if (test.funnelStep?.funnel?.id) {
    revalidatePath(`/dashboard/lejki/${test.funnelStep.funnel.id}`);
  }
}

export async function getCourseABTests(courseId) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok || !courseId) return [];

  const abTestDelegate = prisma.aBTest ?? prisma.abTest;
  return abTestDelegate.findMany({
    where: {
      targetType: "COURSE_SALES_PAGE",
      courseId,
      course: { authorId: auth.userId },
    },
    include: {
      variants: {
        include: { landingPage: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
