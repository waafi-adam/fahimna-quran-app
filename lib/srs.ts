import type { ReviewRecord, ReviewGrade } from '@/types/quran';

// Learning steps in minutes before entering review phase
const LEARNING_STEPS = [1, 6];

const GRADUATION_INTERVAL = 1; // days — first review interval after learning steps
const EASY_GRADUATION_INTERVAL = 3; // days — if user hits Easy during learning
const MIN_EASE = 1.3;
const GRADUATION_THRESHOLD = 60; // days — auto-promote to "known"

export function defaultReviewRecord(): ReviewRecord {
  return { due: Date.now(), interval: 0, ease: 2.5, reps: 0, step: 0 };
}

export function calculateNextReview(
  record: ReviewRecord,
  grade: ReviewGrade,
): ReviewRecord {
  const now = Date.now();

  // --- In learning steps (step < LEARNING_STEPS.length) ---
  if (record.step < LEARNING_STEPS.length) {
    return handleLearningStep(record, grade, now);
  }

  // --- In review phase ---
  return handleReviewPhase(record, grade, now);
}

function handleLearningStep(
  record: ReviewRecord,
  grade: ReviewGrade,
  now: number,
): ReviewRecord {
  switch (grade) {
    case 0: // Forgot — restart learning
      return { ...record, due: now + LEARNING_STEPS[0] * 60_000, step: 0, reps: 0 };

    case 1: // Hard — repeat current step
      return {
        ...record,
        due: now + LEARNING_STEPS[record.step] * 60_000,
        reps: 0,
      };

    case 2: { // Good — advance to next step or graduate
      const nextStep = record.step + 1;
      if (nextStep < LEARNING_STEPS.length) {
        return { ...record, due: now + LEARNING_STEPS[nextStep] * 60_000, step: nextStep };
      }
      // Graduate to review phase
      return {
        ...record,
        due: now + GRADUATION_INTERVAL * 86_400_000,
        interval: GRADUATION_INTERVAL,
        step: LEARNING_STEPS.length,
        reps: 1,
      };
    }

    case 3: // Easy — skip straight to review with longer interval
      return {
        ...record,
        due: now + EASY_GRADUATION_INTERVAL * 86_400_000,
        interval: EASY_GRADUATION_INTERVAL,
        ease: Math.max(MIN_EASE, record.ease + 0.15),
        step: LEARNING_STEPS.length,
        reps: 1,
      };
  }
}

function handleReviewPhase(
  record: ReviewRecord,
  grade: ReviewGrade,
  now: number,
): ReviewRecord {
  let { interval, ease, reps } = record;

  switch (grade) {
    case 0: // Forgot — re-enter learning
      return {
        ...record,
        due: now + LEARNING_STEPS[0] * 60_000,
        interval: 0,
        ease: Math.max(MIN_EASE, ease - 0.2),
        step: 0,
        reps: 0,
      };

    case 1: // Hard
      interval = Math.max(1, interval * 1.2);
      ease = Math.max(MIN_EASE, ease - 0.15);
      reps += 1;
      break;

    case 2: // Good
      interval = Math.max(1, interval * ease);
      reps += 1;
      break;

    case 3: // Easy
      interval = Math.max(1, interval * ease * 1.3);
      ease += 0.15;
      reps += 1;
      break;
  }

  return {
    ...record,
    due: now + Math.round(interval) * 86_400_000,
    interval,
    ease,
    reps,
  };
}

export function isDue(record: ReviewRecord): boolean {
  return Date.now() >= record.due;
}

export function shouldGraduate(record: ReviewRecord): boolean {
  return record.interval >= GRADUATION_THRESHOLD;
}

export function formatInterval(days: number, willGraduate?: boolean): string {
  if (willGraduate) return 'Known ✓';
  if (days <= 0) return '< 1m';
  if (days < 1 / 24) {
    const mins = Math.max(1, Math.round(days * 24 * 60));
    return `${mins}m`;
  }
  if (days < 1) {
    const hrs = Math.round(days * 24);
    return `${hrs}h`;
  }
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/** Preview what each grade would produce (for button labels) */
export function previewIntervals(record: ReviewRecord): {
  forgot: string;
  hard: string;
  good: string;
  easy: string;
} {
  const forgotResult = calculateNextReview(record, 0);
  const hardResult = calculateNextReview(record, 1);
  const goodResult = calculateNextReview(record, 2);
  const easyResult = calculateNextReview(record, 3);

  const intervalInDays = (r: ReviewRecord) => {
    const diff = r.due - Date.now();
    return diff / 86_400_000;
  };

  return {
    forgot: formatInterval(intervalInDays(forgotResult)),
    hard: formatInterval(intervalInDays(hardResult)),
    good: formatInterval(intervalInDays(goodResult), shouldGraduate(goodResult)),
    easy: formatInterval(intervalInDays(easyResult), shouldGraduate(easyResult)),
  };
}
