import * as yaml from "yaml";
import * as swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as path from "path";

export const apiDocs = () => {
  // Path to your swagger.yaml file.
  // Adjust the path if your file is in a different directory relative to the compiled code.
  const swaggerPath = path.join(__dirname, "../spec.yaml");
  const swaggerDocument = yaml.parse(fs.readFileSync(swaggerPath, "utf8"));

  return swaggerUi.setup(swaggerDocument);
};

// const samplePayload = {
//   tweet: {
//     bookmark_count: 21,
//     bookmarked: false,
//     conversation_id_str: "1885585697106428100",
//     created_at: "Sat Feb 01 07:07:17 +0000 2025",
//     display_text_range: [0, 77],
//     entities: {
//       hashtags: [],
//       symbols: [],
//       urls: [],
//       user_mentions: [],
//     },
//     favorite_count: 623,
//     favorited: false,
//     full_text:
//       "Ultimately, I doubt the cartels can be defeated without US Special Operations",
//     id_str: "1885585697106428100",
//     is_quote_status: true,
//     lang: "en",
//     preview:
//       "Ultimately, I doubt the cartels can be defeated without US Special Operations",
//     quote_count: 5,
//     quoted_status_id_str: "1885551148662399353",
//     quoted_status_permalink: {
//       display: "x.com/marionawfal/st…",
//       expanded: "https://twitter.com/marionawfal/status/1885551148662399353",
//       url: "https://t.co/gEfAhyruo5",
//     },
//     reply_count: 213,
//     retweet_count: 80,
//     retweeted: false,
//     url: "https://x.com/elonmusk/status/1885585697106428100",
//     userIdString: "44196397",
//     user_id_str: "44196397",
//   },
//   user: {
//     id: "K0xONpylR3MlqEMUhcpF",
//     xHandle: "elonmusk",
//     xName: "Elon Musk",
//     xScreenName: "elonmusk",
//     xUserID: 44196397,
//     xUserIDStr: "44196397",
//   },
// };
