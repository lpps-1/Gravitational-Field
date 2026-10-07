import { AIM_DEFAULT } from "./physics";
import { DEFAULT_MASS, useLab, type ModuleId, type ViewName } from "./store";

type Lab = ReturnType<typeof useLab.getState>;

export interface TourStep {
  title: string;
  body: string;
  /** What to look for, shown under the text. */
  look?: string;
  /** Short verse reference shown with the step. */
  verse?: string;
  module: ModuleId;
  view?: ViewName;
  /** Set the scene up for this step. */
  enter: (lab: Lab) => void;
  /** Actions that wait for the camera or the mass to settle first (seconds, action). */
  later?: [number, (lab: Lab) => void][];
}

/**
 * The guided tour: one idea per step, in an order a presenter can narrate.
 * Each step sets up the scene itself, so Back and Next always show the right thing.
 */
export const TOUR: TourStep[] = [
  {
    title: "Mass curves spacetime",
    body: "This grid is a picture of space and time. The glowing ball is a mass, like a star. Mass curves spacetime, drawn here as a well in the grid.",
    look: "Drag the view to look around. The grid turns amber where it is most curved.",
    module: "A",
    view: "overview",
    enter: (lab) => {
      lab.setMiraj(false);
      lab.setMass(DEFAULT_MASS);
      lab.clearPaths();
    },
  },
  {
    title: "Floating in orbits (yasbaḥūn)",
    body: "Planets are not pulled along on strings. Each moves freely along the straightest path it can through curved spacetime, and around a mass that path is an orbit.",
    look: "The elliptical orbit is fastest when it passes closest to the mass.",
    verse: "“…and each, in an orbit, is swimming” (Yā-Sīn 36:40).",
    module: "A",
    view: "overview",
    enter: (lab) => {
      lab.setMiraj(false);
      lab.setMass(DEFAULT_MASS);
    },
  },
  {
    title: "Take the mass away",
    body: "With no mass, spacetime is flat and there is nothing to orbit. Each body simply carries on in a straight line.",
    look: "Watch the bodies leave their orbits.",
    module: "A",
    view: "overview",
    enter: (lab) => {
      lab.setMiraj(false);
    },
    later: [[0.4, (lab) => lab.setMass(0)]],
  },
  {
    title: "Does light bend in flat space?",
    body: "Light from a distant star crosses the grid, seen here from above. With no mass anywhere, its path is perfectly straight.",
    module: "B",
    view: "top",
    enter: (lab) => {
      lab.setMiraj(false);
      lab.setMass(0);
      lab.setAim(AIM_DEFAULT);
      lab.clearPaths();
    },
    later: [[1.4, (lab) => lab.firePhoton()]],
  },
  {
    title: "Light follows curved spacetime",
    body: "Now the same light passes a mass, and its path bends around the well. The observer on the right sees the star along the dotted line, away from where it really is. This is gravitational lensing.",
    look: "Real starlight passing the Sun bends by only 0.0005°. Here it is exaggerated so you can see it.",
    module: "B",
    view: "top",
    enter: (lab) => {
      lab.setMiraj(false);
      lab.setMass(DEFAULT_MASS);
      lab.setAim(AIM_DEFAULT);
      lab.clearPaths();
    },
    later: [[1.8, (lab) => lab.firePhoton()]],
  },
  {
    title: "Two identical clocks",
    body: "Clock A is far from the mass. Clock B sits deep in the well. They have just been set to zero together.",
    look: "Watch Clock B's second hand: it sweeps more slowly, so B falls behind.",
    module: "C",
    view: "clocks",
    enter: (lab) => {
      lab.setMiraj(false);
      lab.setMass(DEFAULT_MASS);
      lab.clearPaths();
      lab.resetClocks();
    },
  },
  {
    title: "More mass, slower time",
    body: "A deeper well slows Clock B even more. At full mass it runs at about a third of Clock A's rate.",
    verse: "“A day with your Lord is like a thousand years of those which you count” (Al-Ḥajj 22:47).",
    module: "C",
    view: "clocks",
    enter: (lab) => {
      lab.setMiraj(false);
      lab.setMass(100);
    },
  },
  {
    title: "The seven skies",
    body: "Now the scene becomes seven skies, one above another. Follow the four steps shown at the top of the view.",
    verse: "“…who created seven heavens in layers” (Al-Mulk 67:3).",
    module: "D",
    enter: (lab) => {
      lab.setMiraj(true);
    },
  },
  {
    title: "Through the tunnel",
    body: "Folded, the skies form one tunnel. Light crosses all seven in a fraction of a second, along a route far shorter than the way across them.",
    look: "You are looking straight up the tunnel. Press Fire to send more light.",
    module: "D",
    view: "under",
    enter: (lab) => {
      lab.setMiraj(true);
    },
    later: [[1.4, (lab) => lab.firePhoton()]],
  },
  {
    title: "Explore on your own",
    body: "That's the tour. Change the mass, aim the light, compare the clocks, or engage the Miraj again. Reset all puts everything back.",
    module: "A",
    view: "overview",
    enter: (lab) => {
      lab.setMiraj(false);
      lab.setMass(DEFAULT_MASS);
    },
  },
];

/** Enter a tour step: set the scene, the camera and the explanation tab. */
export function enterTourStep(index: number): () => void {
  const step = TOUR[index];
  const lab = useLab.getState();
  lab.setTourStep(index);
  step.enter(lab);
  lab.setFocus(step.module);
  if (step.view) lab.setView(step.view);
  const timers = (step.later ?? []).map(([seconds, action]) =>
    window.setTimeout(() => {
      if (useLab.getState().tour.active && useLab.getState().tour.step === index) action(useLab.getState());
    }, seconds * 1000),
  );
  return () => timers.forEach((t) => window.clearTimeout(t));
}
