/**
 * Rule-based reuse suggestions for each plastic type
 */
const suggestions = {
  PET: [
    'Shred and mix with sand to make eco-bricks',
    'Melt into plastic pellets for brick manufacturing',
    'Use as fiber reinforcement in concrete slabs',
    'Convert into paver blocks for pathways',
    'Create plant pots and garden edging',
  ],
  HDPE: [
    'Melt and extrude into plastic lumber for benches',
    'Grind and mix into asphalt for road construction',
    'Form into drainage pipes and culverts',
    'Create playground equipment panels',
    'Manufacture recycled plastic fencing',
  ],
  PVC: [
    'Extrude into flooring tiles',
    'Form into wall cladding panels',
    'Create electrical conduit piping',
    'Make window frame profiles',
    'Use as waterproof roofing membrane base',
  ],
  LDPE: [
    'Press into insulation sheets for walls',
    'Create composite decking boards',
    'Mix into lightweight tiles',
    'Use as moisture barrier in construction',
    'Roll into plastic sheeting for greenhouses',
  ],
  PP: [
    'Injection-mold into roof tiles',
    'Form structural beams and columns',
    'Create corrugated roofing sheets',
    'Use as load-bearing floor panels',
    'Manufacture storage containers and pallets',
  ],
  PS: [
    'Compress into lightweight foam insulation panels',
    'Use as sound-dampening wall boards',
    'Create void-form blocks for concrete foundations',
    'Shred into packaging fill material',
    'Mold into decorative architectural elements',
  ],
};

/**
 * Returns up to 3 random reuse suggestions for a plastic type
 * @param {string} plasticType - e.g. 'PET', 'HDPE'
 * @returns {string[]}
 */
function getSuggestions(plasticType) {
  const list = suggestions[plasticType?.toUpperCase()] || [];
  if (list.length === 0) return ['Consult a local recycling facility for proper disposal'];
  // Shuffle and pick 3
  const shuffled = list.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

module.exports = { getSuggestions };
