# skt.us Hosted Skynet Kernel

This is an experimental early test for supporting `libkernel` applications if the user doesn't have the browser extension installed. Latest deployment is available at https://skt.us

## Building

To reproduce the deployment, you'll need:

- `browserify` installed (`npm install -g browserify`)
- `skydeploy` installed and included in your PATH. [Download here.](https://github.com/redsolver/skydeploy/releases)
- To build the [`skynet-kernel` extension](https://github.com/SkynetLabs/skynet-kernel).

The repo has a committed `bundle/content-kernel.ts` file, but you'll want to replace it with symlink pointing to the built "bundle" file from your local `skynet-kernel` project.

`ln -s ../../skynet-kernel/extension/bundle/content-kernel.ts`

Next, run `npm run deploy`. To just build locally, run `npm run build`. To serve from a local sever, build, then run `npm run serve`.
