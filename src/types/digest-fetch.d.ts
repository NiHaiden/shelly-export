declare module "digest-fetch" {
  class DigestFetch {
    constructor(username: string, password: string, options?: object);
    fetch(url: string, options?: RequestInit): Promise<Response>;
  }
  export default DigestFetch;
}
