export const PLAN = [
  {
    title: 'Push',
    tag: 'Chest · Shoulders · Triceps',
    focus: 'Mon — pressing power. Heavy on the flat/incline press, then shape the shoulders and arms.',
    colorVar: '--push',
    cardio: '15 min treadmill, incline 8–10%, brisk walk you can just hold a conversation through.',
    exercises: [
      { id: 'flat-barbell-bench-press', name: 'Flat Barbell Bench Press', setsCount: 4, repRange: '6–8', restSeconds: 90, startWeight: '50–60 kg bar', watchUrl: 'https://www.google.com/search?q=flat+barbell+bench+press+how+to', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif' },
      { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '18–22 kg / hand', watchUrl: 'https://www.google.com/search?q=incline+dumbbell+press+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif' },
      { id: 'seated-dumbbell-shoulder-press', name: 'Seated Dumbbell Shoulder Press', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '16–20 kg / hand', watchUrl: 'https://www.google.com/search?q=seated+dumbbell+shoulder+press', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Shoulder-Press.gif' },
      { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: '7–10 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+lateral+raise+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif' },
      { id: 'lying-dumbbell-triceps-extension', name: 'Lying Dumbbell Triceps Extension', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '8–12 kg / hand', watchUrl: 'https://www.google.com/search?q=lying+dumbbell+triceps+extension+skullcrusher', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Dumbbell-Skull-Crusher.gif' },
      { id: 'close-grip-dumbbell-press', name: 'Close-Grip Dumbbell Press', setsCount: 2, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg / hand', watchUrl: 'https://www.google.com/search?q=close+grip+dumbbell+press+triceps', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/10/Close-Grip-Dumbbell-Press.gif' }
    ]
  },
  {
    title: 'Pull',
    tag: 'Back · Biceps · Rear Delts',
    focus: 'Tue — rowing volume builds the V-taper that makes the waist look smaller. Preacher bench earns its keep here.',
    colorVar: '--pull',
    cardio: "15 min treadmill incline walk, or skip if you're spent — Pull day is long.",
    exercises: [
      { id: 'bent-over-barbell-row', name: 'Bent-Over Barbell Row', setsCount: 4, repRange: '6–8', restSeconds: 90, startWeight: '40–50 kg bar', watchUrl: 'https://www.google.com/search?q=bent+over+barbell+row+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif' },
      { id: 'one-arm-dumbbell-row', name: 'One-Arm Dumbbell Row', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '22–28 kg / hand', watchUrl: 'https://www.google.com/search?q=one+arm+dumbbell+row+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif' },
      { id: 'chest-supported-dumbbell-row', name: 'Chest-Supported Dumbbell Row (incline bench)', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg / hand', watchUrl: 'https://www.google.com/search?q=chest+supported+incline+dumbbell+row', gifUrl: 'https://gymvisual.com/img/p/3/7/3/6/8/37368.gif' },
      { id: 'back-hyperextension', name: 'Back Hyperextension', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: 'bodyweight → hold plate', watchUrl: 'https://www.google.com/search?q=back+hyperextension+chair+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/hyperextension.gif' },
      { id: 'preacher-curl', name: 'Preacher Curl (EZ/straight bar)', setsCount: 3, repRange: '8–10', restSeconds: 60, startWeight: '20–30 kg bar', watchUrl: 'https://www.google.com/search?q=barbell+preacher+curl+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Preacher-Curl.gif' },
      { id: 'dumbbell-hammer-curl', name: 'Dumbbell Hammer Curl', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '10–14 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+hammer+curl+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif' },
      { id: 'rear-delt-dumbbell-fly', name: 'Rear-Delt Dumbbell Fly', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: '6–9 kg / hand', watchUrl: 'https://www.google.com/search?q=rear+delt+dumbbell+fly+bent+over', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bent-Over-Dumbbell-Rear-Delt-Raise-With-Head-On-Bench.gif' }
    ]
  },
  {
    title: 'Legs + Core',
    tag: 'Quads · Hams · Glutes · Abs',
    focus: "Wed — legs are your biggest fat-burning engine. No rack needed; dumbbells and a barbell on the back do the job.",
    colorVar: '--legs',
    cardio: 'Optional 10 min easy walk to flush the legs — keep it light after squats.',
    exercises: [
      { id: 'goblet-squat', name: 'Goblet Squat (or DB Front Squat)', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '24–32 kg DB', watchUrl: 'https://www.google.com/search?q=goblet+squat+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2023/01/Dumbbell-Goblet-Squat.gif' },
      { id: 'dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '22–28 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+romanian+deadlift+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Romanian-Deadlift.gif' },
      { id: 'bulgarian-split-squat', name: 'Walking / Bulgarian Split Squat', setsCount: 3, repRange: '10 / leg', restSeconds: 60, startWeight: '12–18 kg / hand', watchUrl: 'https://www.google.com/search?q=bulgarian+split+squat+dumbbell+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Dumbbell-Bulgarian-Split-Squat.gif' },
      { id: 'dumbbell-calf-raise', name: 'Dumbbell Calf Raise', setsCount: 4, repRange: '15–20', restSeconds: 45, startWeight: '20–30 kg / hand', watchUrl: 'https://www.google.com/search?q=standing+dumbbell+calf+raise', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Calf-Raise.gif' },
      { id: 'hanging-leg-raise', name: 'Hanging-Free Leg Raise / Lying Leg Raise', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: 'bodyweight', watchUrl: 'https://www.google.com/search?q=lying+leg+raise+abs+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/08/Hanging-Leg-Raises.gif' },
      { id: 'plank', name: 'Plank', setsCount: 3, repRange: '45–60s hold', restSeconds: 45, startWeight: 'bodyweight', watchUrl: 'https://www.google.com/search?q=plank+exercise+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/plank.gif' }
    ]
  },
  {
    title: 'Upper',
    tag: 'Chest · Back · Arms blend',
    focus: 'Thu — second upper hit at higher reps. Lighter than Mon/Tue, more pump, more fat-burn density. Supersets welcome.',
    colorVar: '--push',
    cardio: '20 min treadmill intervals: 1 min fast / 2 min walk × 6, or steady incline walk.',
    exercises: [
      { id: 'incline-barbell-bench-press', name: 'Incline Barbell Bench Press', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '40–50 kg bar', watchUrl: 'https://www.google.com/search?q=incline+barbell+bench+press+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Barbell-Bench-Press.gif' },
      { id: 'decline-dumbbell-press', name: 'Decline Dumbbell Press', setsCount: 3, repRange: '10–12', restSeconds: 75, startWeight: '16–20 kg / hand', watchUrl: 'https://www.google.com/search?q=decline+dumbbell+press+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Decline-Dumbbell-Press.gif' },
      { id: 'two-arm-dumbbell-row', name: 'Two-Arm Dumbbell Row', setsCount: 4, repRange: '10–12', restSeconds: 75, startWeight: '18–24 kg / hand', watchUrl: 'https://www.google.com/search?q=two+arm+dumbbell+row+bent+over', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bent-Over-Dumbbell-Row.gif' },
      { id: 'dumbbell-pullover', name: 'Dumbbell Pullover (lat/chest)', setsCount: 3, repRange: '12', restSeconds: 60, startWeight: '16–22 kg', watchUrl: 'https://www.google.com/search?q=dumbbell+pullover+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Pullover.gif' },
      { id: 'standing-dumbbell-curl', name: 'Standing Dumbbell Curl', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '12–16 kg / hand', watchUrl: 'https://www.google.com/search?q=standing+dumbbell+biceps+curl+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif' },
      { id: 'overhead-dumbbell-triceps-extension', name: 'Overhead Dumbbell Triceps Extension', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg', watchUrl: 'https://www.google.com/search?q=overhead+dumbbell+triceps+extension', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Seated-Dumbbell-Triceps-Extension.gif' },
      { id: 'lateral-raise-dropset', name: 'Lateral Raise (drop set last set)', setsCount: 3, repRange: '15', restSeconds: 60, startWeight: '6–9 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+lateral+raise+drop+set', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif' }
    ]
  },
  {
    title: 'Lower + Core',
    tag: 'Posterior chain · Abs',
    focus: 'Fri — hamstring/glute lean toward the posterior chain, plus the heaviest ab day to finish the week.',
    colorVar: '--legs',
    cardio: '20–25 min steady incline walk — fasted morning or after lifting, your call.',
    exercises: [
      { id: 'barbell-romanian-deadlift', name: 'Barbell Romanian Deadlift', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '50–60 kg bar', watchUrl: 'https://www.google.com/search?q=barbell+romanian+deadlift+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif' },
      { id: 'goblet-heels-elevated-squat', name: 'Goblet / Heels-Elevated Squat', setsCount: 3, repRange: '10–12', restSeconds: 75, startWeight: '24–30 kg DB', watchUrl: 'https://www.google.com/search?q=heels+elevated+goblet+squat', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2025/07/Heel-Elevated-Goblet-Squat.gif' },
      { id: 'dumbbell-reverse-lunge', name: 'Dumbbell Reverse Lunge', setsCount: 3, repRange: '10 / leg', restSeconds: 60, startWeight: '12–16 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+reverse+lunge+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2022/09/Dumbell-reverse-lunge.gif' },
      { id: 'weighted-back-hyperextension', name: 'Back Hyperextension (weighted)', setsCount: 3, repRange: '12', restSeconds: 60, startWeight: 'hold 10–20 kg plate', watchUrl: 'https://www.google.com/search?q=weighted+back+hyperextension', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Weighted-Back-Extension.gif' },
      { id: 'dumbbell-russian-twist', name: 'Dumbbell Russian Twist', setsCount: 3, repRange: '16 (8/side)', restSeconds: 45, startWeight: '8–12 kg', watchUrl: 'https://www.google.com/search?q=dumbbell+russian+twist+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Russian-Twist.gif' },
      { id: 'weighted-crunch', name: 'Weighted Crunch / Cable-free Crunch', setsCount: 3, repRange: '15', restSeconds: 45, startWeight: 'hold 5–10 kg DB', watchUrl: 'https://www.google.com/search?q=weighted+crunch+form', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Weighted-Crunch.gif' },
      { id: 'dead-bug', name: 'Dead Bug', setsCount: 2, repRange: '12 / side', restSeconds: 45, startWeight: 'bodyweight', watchUrl: 'https://www.google.com/search?q=dead+bug+core+exercise', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Dead-Bug.gif' }
    ]
  }
];
