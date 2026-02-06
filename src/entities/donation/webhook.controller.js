const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const userId = session.metadata.userId;
      const planId = session.metadata.planId;
      const billingCycle = session.metadata.billingCycle;

      const plan = await Plan.findById(planId);
      if (!plan) return res.status(400).send("Plan not found");

      const user = await User.findById(userId);
      if (!user) return res.status(400).send("User not found");

      /**
       * ----------------------------------
       * CALCULATE SUBSCRIPTION DATES
       * ----------------------------------
       */
      const startDate = new Date();
      let endDate = null;

      if (billingCycle === "monthly") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
      }

      if (billingCycle === "yearly") {
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      /**
       * ----------------------------------
       * UPDATE USER SUBSCRIPTION (CRITICAL)
       * ----------------------------------
       */
      user.subscription = {
        planId: plan._id,
        startDate,
        endDate
      };

      user.subscriptionUsage = {
        returnOrdersUsed: 0 // 🔥 RESET USAGE
      };

      user.hasActiveSubscription = true;
      user.subscriptionExpireDate = endDate;

      await user.save();
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Stripe webhook error:", error);
    res.status(500).send("Webhook processing failed");
  }
};