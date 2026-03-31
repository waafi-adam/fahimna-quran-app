declare interface RequireContext {
  (id: string): any;
  keys(): string[];
}

declare interface NodeRequire {
  context(
    directory: string,
    useSubDirectories?: boolean,
    regExp?: RegExp,
  ): RequireContext;
}
