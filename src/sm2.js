// Classic SM-2 spaced-repetition algorithm (the same one Anki is built on).
// grade is 0-5: we feed it 5 for a Deep Check pass, 2 for a fail — coarse,
// but SM-2 was designed for exactly this kind of "did you get it or not" input.
export function sm2(prev, grade) {
  const prevInterval = prev?.interval ?? 0;
  const prevEase = prev?.ease ?? 2.5;
  const prevReps = prev?.reps ?? 0;

  let ease = prevEase + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (ease < 1.3) ease = 1.3;

  let reps, interval;
  if (grade < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps = prevReps + 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(prevInterval * ease);
  }

  const due = new Date();
  due.setDate(due.getDate() + interval);

  return { interval, ease, reps, dueDate: due.toISOString().slice(0, 10) };
}

export function isDue(node) {
  if (!node.srsDueDate) return false;
  return node.srsDueDate <= new Date().toISOString().slice(0, 10);
}
