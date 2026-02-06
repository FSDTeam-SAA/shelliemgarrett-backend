import { generateResponse } from "../../lib/responseFormate.js";
import { createCampaignService } from "./campaign.service.js";


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
