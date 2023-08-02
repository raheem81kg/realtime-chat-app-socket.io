import { gql } from "@apollo/client";

const GET_MESSAGES = gql`
    query getMessages($chatId: ID!) {
        messages(chatId: $chatId) {
            id
            chatId
            sender
            message
            createdAt
        }
    }
`;

export { GET_MESSAGES };
