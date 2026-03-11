import { generateResponse } from "../../lib/responseFormate.js";
import {
  createCampaignService,
  getAllCampaignsService,
  getCampaignByIdService,
  updateCampaignService,
  deleteCampaignService,
  getMyDonationsService,
} from "./campaign.service.js";


export const createCampaignController = async (req, res, next) => {
  try {
    const { name, description, raiseGoal } = req.body;

    const data = await createCampaignService({
      name,
      description,
      raiseGoal,
      createdBy: req.user?._id,
      files: req.files
    });

    return generateResponse(
      res,
      201,
      true,
      "Campaign created successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

export const updateCampaignController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, raiseGoal } = req.body;

    const data = await updateCampaignService({
      campaignId: id,
      name,
      description,
      raiseGoal,
      files: req.files,
    });

    return generateResponse(
      res,
      200,
      true,
      "Campaign updated successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

export const deleteCampaignController = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteCampaignService(id);

    return generateResponse(
      res,
      200,
      true,
      "Campaign deleted successfully",
      null
    );
  } catch (error) {
    next(error);
  }
};


export const getAllCampaignsController = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const data = await getAllCampaignsService({ page, limit });

    return generateResponse(
      res,
      200,
      true,
      "Campaigns fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};


export const getCampaignByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await getCampaignByIdService(id);

    return generateResponse(
      res,
      200,
      true,
      "Campaign fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

export const getMyDonations = async (req, res, next) => {
  try {
    const email = req.user.email;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const data = await getMyDonationsService({
      email,
      page,
      limit
    });

    generateResponse(res, 200, true, "My campaign donations fetched", data);
  } catch (error) {
    next(error);
  }
};
