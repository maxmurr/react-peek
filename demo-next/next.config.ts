import type { NextConfig } from "next";
import { withReactPeek } from "react-peek/next";

const nextConfig: NextConfig = {};

export default withReactPeek({ editor: "cursor" })(nextConfig);
