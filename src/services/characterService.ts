/*
Purpose of this file:
- Fetches character data from JSON file
- Transforms the JSON data into character interfaces (defined in ../obj/Character.ts)
*/
import { type CharacterData } from '../obj/characterInterfaces'; // cross check the 'type' bit
const CHARACTERS_URL = 'http://localhost:3000/characters';

// getAllCharacters() returns all character data from characters.json
export async function getAllCharacters() {
    // Try including a promise later
    try {
        const response = await fetch(CHARACTERS_URL);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch characters: ${response.status} ${response.statusText}`);
        }

        const data: Record<string, CharacterData> = await response.json(); // string -> character ID, CharacterData -> profile, AI
        return data;

    } catch(err) {
        console.error("Error loading characters: ", err);
        return {};
    }
}


// getCharacterById() returns a single character's data based on their ID
// Has a promise that it either returns the CharacterData object or null object
export async function getCharacterById(id: string): Promise<CharacterData | null> {
    try {
        const allCharacters = await getAllCharacters();
        const currentCharacter = allCharacters[id];
        if (!currentCharacter) {
            return null;
        }
        return currentCharacter;
        
    } catch(err) {
        console.error(`Error loading character with ID ${id}: `, err);
        return null;
    }
}
