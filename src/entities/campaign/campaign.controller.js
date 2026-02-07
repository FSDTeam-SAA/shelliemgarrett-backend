import { generateResponse } from "../../lib/responseFormate.js";
import { createCampaignService, getAllCampaignsService, getCampaignByIdService } from "./campaign.service.js";


export const createCampaignController = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const data = await createCampaignService({
      name,
      description,
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
