import { gql } from "@apollo/client";

const SAVE_MESSAGE = gql`
    mutation addMessage($chatId: ID!, $sender: String!, $message: String!) {
        addMessage(chatId: $chatId, sender: $sender, message: $message) {
            id
            chatId
            sender
            message
            createdAt
        }
    }
`;

export { SAVE_MESSAGE };
