import { User } from "../models/user.model";
import { ApiError } from "./ApiError";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findOne(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating a refresh token and access token.",
      err
    );
  }
};

export default generateAccessAndRefreshToken;
