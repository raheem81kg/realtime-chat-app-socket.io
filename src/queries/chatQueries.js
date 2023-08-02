import { gql } from "@apollo/client";

const GET_CHAT = gql`
    query singleChat($member1: String!, $member2: String!) {
        singleChat(member1: $member1, member2: $member2) {
            id
            members
            groupName
        }
    }
`;

const GET_CHATS = gql`
    query getChats($member: String!) {
        chats(member: $member) {
            id
            members
            groupName
        }
    }
`;

export { GET_CHATS, GET_CHAT };
