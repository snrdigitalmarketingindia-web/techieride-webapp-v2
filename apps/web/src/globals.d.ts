// Allow importing CSS files as side-effects (e.g. maplibre-gl/dist/maplibre-gl.css)
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
