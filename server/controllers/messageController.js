const Messages = require("../models/messageModel");
const Contacts = require("../models/contactModel"); // Assuming you created a contact model

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;

    // Add the message to the database
    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    if (data) {
      // Add 'to' user to 'from' user's contact list and vice versa
      await Promise.all([
        Contacts.findOneAndUpdate(
          { userId: from },
          {
            $addToSet: {
              contacts: { contactId: to, lastMessage: message },
            },
          },
          { upsert: true }
        ),
        Contacts.findOneAndUpdate(
          { userId: to },
          {
            $addToSet: {
              contacts: { contactId: from, lastMessage: message },
            },
          },
          { upsert: true }
        ),
      ]);

      return res.json({ msg: "Message added successfully." });
    } else {
      return res.json({ msg: "Failed to add message to the database" });
    }
  } catch (ex) {
    next(ex);
  }
};

// Add a new method to fetch user contacts
module.exports.getContacts = async (req, res, next) => {
  try {
    const { userId } = req.params; // Get the user ID from params
    const contacts = await Contacts.findOne({ userId }).populate("contacts.contactId", "username avatarImage _id");

    if (!contacts) return res.json([]);

    res.json(contacts.contacts);
  } catch (ex) {
    next(ex);
  }
};
