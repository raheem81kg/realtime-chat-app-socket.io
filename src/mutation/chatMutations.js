import { gql } from "@apollo/client";

const CREATE_CHAT = gql`
    mutation addChat($groupName: String, $members: [String]!) {
        addChat(groupName: $groupName, members: $members) {
            id
            groupName
            members
        }
    }
`;

const ADD_MEMBER_TO_CHAT = gql`
    mutation addMember($userName: String!, $chatId: ID!) {
        addMember(userName: $userName, chatId: $chatId) {
            id
            groupName
            members
        }
    }
`;

export { CREATE_CHAT, ADD_MEMBER_TO_CHAT };
