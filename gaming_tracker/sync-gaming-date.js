// sync-gaming-data.js
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const databaseId = process.env.NOTION_DATABASE_ID;
const totalGamesCount = process.env.TOTAL_STEAM_LIBRARY || 100;

async function getCompletedGames() {
  try {
    // Query all entries from the Notion database
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "Status", // Change this to match your status property name
        select: {
          equals: "Completed" // Change this to match your "completed" status value
        }
      },
      sorts: [
        {
          property: "Created", // Change this to match your date property
          direction: "descending"
        }
      ]
    });

    // Transform Notion data to our JSON format
    const games = response.results.map(page => {
      // Extract data from Notion properties
      // Note: You'll need to adjust these property names to match your Notion database
      const name = page.properties.Name.title[0]?.plain_text || "Unknown Game";
      
      // Get the created date (or completion date if you track that)
      let dateCompleted;
      if (page.properties.Created && page.properties.Created.created_time) {
        dateCompleted = page.properties.Created.created_time;
      } else {
        dateCompleted = page.created_time;
      }
      
      // Get platform property if it exists
      let platform = "PC";
      if (page.properties.Platform && page.properties.Platform.select) {
        platform = page.properties.Platform.select.name;
      }

      return {
        name,
        status: "Completed",
        dateCompleted,
        platform
      };
    });

    return {
      totalLibrarySize: parseInt(totalGamesCount, 10),
      lastUpdated: new Date().toISOString(),
      games
    };
  } catch (error) {
    console.error("Error fetching data from Notion:", error);
    throw error;
  }
}

async function updateGitHubJson() {
  try {
    // Get the data from Notion
    const gameData = await getCompletedGames();
    
    // Convert to JSON string with nice formatting
    const jsonData = JSON.stringify(gameData, null, 2);
    
    // Write to file
    const filePath = path.join(__dirname, 'gaming-stats.json');
    fs.writeFileSync(filePath, jsonData);
    
    console.log('Successfully updated gaming-stats.json');
  } catch (error) {
    console.error('Error updating GitHub JSON:', error);
    process.exit(1);
  }
}

// Run the sync
updateGitHubJson();
