import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});
const app = express();
const port = process.env.PORT || 8000;
connectDB()
  .then(() => {
    app.listen(port, () => console.log("listening on port " + port));
  })
  .catch((err) => {
    console.error("mongodb connection failed !!!", err);
  });

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/ ${DB_NAME}`);
//     app.on("error", (err) => {
//       console.log(err);
//       throw err;
//     });

//     app.listen(port, () => console.log("listening on port " + port));
//   } catch (err) {
//     console.error(err);
//     throw err;
//   }
// })();
