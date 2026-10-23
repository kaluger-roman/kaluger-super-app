/// <reference types="vite/client" />

// Files of the shared project run on one module graph, so a model one file loaded keeps reacting
// to the events the next file fires. Loading every model up front makes that the same for every
// file and every order: a test that triggers another model's request fails each time, not only
// after some other file happened to load that model.
import.meta.glob(["../**/*.model.ts", "!../**/__tests__/**"], { eager: true });
