import { generateResponse } from "../../lib/responseFormate";
import { createDonationSessionService } from "./donation.service";


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
