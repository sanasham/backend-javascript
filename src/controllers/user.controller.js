import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import generateAccessAndRefreshToken from "../utils/tokens.js";
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  //validation - not empty
  // check if the user already exists: userName and email
  //check for images, check for avatar
  // upload them to cloudinary,  check avatar

  // create user object-
  // create entry into db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { fullName, email, userName, password } = req.body;
  // if(fullName === "") {
  //   throw new ApiError(400, "fullname is required");
  // }
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "userName or email already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  console.log("avatar response received", avatar);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(400, "Something went wrong while registering a user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get the username or email from body
  //find the user
  // check password
  // generate access token and refresh token
  // send cookie
  const { userName, email, password } = req.body;
  if (!userName && !email) {
    throw new ApiError(400, "username or email is required");
  }
  const userExists = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!userExists) {
    throw new ApiError(404, "user does not exist");
  }
  const isPasswordValied = await userExists.isPasswordCorrect(password);

  if (!isPasswordValied) {
    throw new ApiError(401, "Invalied user credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    userExists._id
  );
  userExists.accessToken = accessToken;
  userExists.refreshToken = refreshToken;

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        {
          user: userExists,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "User Logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
