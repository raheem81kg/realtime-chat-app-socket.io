import { gql } from "@apollo/client";

const GET_UNREAD_MESSAGES = gql`
    query getUnreadMessages($chatId: ID!, $receiver: String!) {
        unreadMessages(chatId: $chatId, receiver: $receiver)
    }
`;

const ADD_UNREAD_MESSAGES = gql`
    query addUnreadMessages($messages: [UnreadMessageInput!]!) {
        addUnreadMessages(messages: $messages) {
            message
        }
    }
`;

export { GET_UNREAD_MESSAGES, ADD_UNREAD_MESSAGES };
