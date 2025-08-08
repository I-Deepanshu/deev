declare module "glob" {
  export function glob(pattern: string, options?: any): string[];
  export function sync(pattern: string, options?: any): string[];
}
