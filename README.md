# skt.us Hosted Skynet Kernel

This is an experimental early test for supporting `libkernel` applications if the user doesn't have the browser extension installed. Latest deployment is available at https://skt.us

## Building

To reproduce the deployment, you'll need:

- To be able to build the `skynet-kernel` extension
- `browserify` installed
- `skydeploy` installed and included in your PATH.

The repo has a committed `bundle/content-kernel.ts` file, but you'll want to replace it with symlink to the build file from your local `skynet-kernel` project.

`ln -s ../../skynet-kernel/extension/bundle/content-kernel.ts`

Next, run `npm run deploy`. To run a local sever instead, run `npm run serve`.
