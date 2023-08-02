import { gql } from "@apollo/client";

const DELETE_UNREAD_MESSAGES = gql`
    mutation deleteUnreadMessages($chatId: ID!, $receiver: String!) {
        removeUnread(chatId: $chatId, receiver: $receiver) {
            id
        }
    }
`;

const DELETE_AND_RETURN_UNREAD_MESSAGES = gql`
    mutation deleteAndReturnUnreadMessages($chatId: ID!, $receiver: String!) {
        deleteAndReturnUnreadMessages(chatId: $chatId, receiver: $receiver)
    }
`;

export { DELETE_UNREAD_MESSAGES, DELETE_AND_RETURN_UNREAD_MESSAGES };
