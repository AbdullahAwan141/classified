const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const startIndex = code.indexOf('{/* Neural Roulette Modal */}');
const endIndex = code.indexOf('{/* Header */}');

if (startIndex !== -1 && endIndex !== -1) {
  const newModal = `{/* Casino Roulette Modal */}
      <AnimatePresence>
        {isRouletteOpen && (
          <CasinoRoulette onClose={() => setIsRouletteOpen(false)} />
        )}
      </AnimatePresence>

      `;
  
  code = code.substring(0, startIndex) + newModal + code.substring(endIndex);
  fs.writeFileSync('src/App.tsx', code);
  console.log('App.tsx updated successfully.');
} else {
  console.log('Could not find markers', startIndex, endIndex);
}
