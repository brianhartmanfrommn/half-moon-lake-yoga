interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  // add other variables here as needed
}