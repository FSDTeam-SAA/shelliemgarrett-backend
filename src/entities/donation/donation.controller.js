import { generateResponse } from "../../lib/responseFormate.js";
import { createDonationSessionService, getAllDonationsService } from "./donation.service.js";


export const createDonationSessionController = async (req, res, next) => {
  try {
    const session = await createDonationSessionService(req.body);

    return generateResponse(
      res,
      200,
      true,
      "Stripe session created",
      session
    );
  } catch (error) {
    next(error);
  }
};

export const getAllDonationsController = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const data = await getAllDonationsService({ page, limit });

    return generateResponse(
      res,
      200,
      true,
      "Donations fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};
