import frenchMessages from './fr.js';
import { CORNER_SETUPS, EDGE_SETUPS } from '../data/blind3x3Data.js';

const messages = Object.fromEntries(
  Object.keys(frenchMessages).map(key => [key, ''])
);

Object.assign(messages, {
  'english.title': 'Cube Studio in English',
  'english.description': 'The English version of the guides and training tools is ready.',
  'english.back': 'Continue in French',
  'app.home.eyebrow': 'Interactive 3D cube simulator',
  'app.home.title': 'Cube Studio',
  'app.home.description': 'Practice speedcubing, explore algorithms in 3D, and learn each solving method.',
  'app.home.play.title': 'Play',
  'app.home.play.description': 'Timed and untimed 2x2, 3x3, and 4x4 solves',
  'app.home.learn.title': 'Learn',
  'app.home.learn.description': 'Guides for 2x2, 3x3, CFOP, Ortega, and Yau',
  'app.play.eyebrow': '3D simulator',
  'app.play.title': 'Choose your cube',
  'app.play.description': 'Choose a size and start a timed or untimed solve.',
  'app.play.2x2.title': 'Pocket Cube 2x2',
  'app.play.2x2.description': 'Quick, nimble solves',
  'app.play.3x3.title': "Rubik's Cube 3x3",
  'app.play.3x3.description': 'The classic format',
  'app.play.4x4.title': 'Master Cube 4x4',
  'app.play.4x4.description': 'Movable centers and parity cases',
  'app.algos.eyebrow': 'Guides and practice',
  'app.algos.title': 'Solving methods',
  'app.algos.description': 'Follow each method step by step or practise with specific cases.',
  'app.algos.simple2x2.tag': '2x2 · Beginner',
  'app.algos.simple2x2.title': 'Beginner method · 2x2',
  'app.algos.simple2x2.description': 'Solve the 2x2 in three clearly illustrated steps.',
  'app.algos.ortega2x2.tag': '2x2 · Intermediate',
  'app.algos.ortega2x2.title': 'Ortega method · 2x2',
  'app.algos.ortega2x2.description': 'Build the first face, then learn 7 OLL and 5 PBL cases.',
  'app.algos.simple3x3.tag': '3x3 · Beginner',
  'app.algos.simple3x3.title': 'Beginner method · 3x3',
  'app.algos.simple3x3.description': 'A complete, illustrated guide in seven steps.',
  'app.algos.cfop3x3.tag': '3x3 · Advanced',
  'app.algos.cfop3x3.title': 'CFOP method · 3x3',
  'app.algos.cfop3x3.description': 'F2L, 2-look and full OLL (57) and PLL (21) algorithms.',
  'app.algos.blind3x3.tag': '3x3 · Blindfolded',
  'app.algos.blind3x3.title': 'Old Pochmann · Speffz',
  'app.algos.blind3x3.description': 'An interactive Speffz lettering scheme, buffers, edge and corner setups, and parity.',
  'app.algos.simple4x4.tag': '4x4 · Beginner',
  'app.algos.simple4x4.title': 'Beginner method · 4x4',
  'app.algos.simple4x4.description': 'Build the centers, pair the edges, reduce to a 3x3, and handle parity.',
  'app.algos.yau4x4.tag': '4x4 · Advanced',
  'app.algos.yau4x4.title': 'Yau method · 4x4',
  'app.algos.yau4x4.description': 'Solve the centers and cross, pair edges 3-2-3, then handle parity.',
  'method.simple2x2.title': 'Beginner method · 2x2',
  'method.simple3x3.title': 'Beginner method · 3x3',
  'method.simple4x4.title': 'Beginner method · 4x4',
  'method.ortega2x2.title': 'Ortega method · 2x2',
  'method.cfop3x3.title': 'CFOP algorithms · {{section}}',
  'method.yau4x4.title': 'Yau method · 4x4 (speedsolving / CFOP)',
  'common.back': 'Back',
  'common.backHome': 'Back to home',
  'common.backCubes': 'Cube selection',
  'common.backAlgos': 'Back to methods',
  'common.close': 'Close',
  'common.case': 'Case',
  'common.name': 'Name',
  'common.nameLabel': 'Name:',
  'common.demo3d': '3D demo',
  'common.test': 'Try it',
  'common.learned': 'Learned',
  'common.markLearned': 'Mark as learned',
  'language.switchToEnglish': 'Switch to English',
  'language.switchToFrench': 'Switch to French',
  'move.ariaLabel': 'Move {{label}}',
  'game.record': 'Best: {{time}}',
  'game.case': 'Case: {{name}}',
  'game.resetCase': 'Reset case',
  'game.shuffle': 'Scramble',
  'game.showAlgorithm': 'Show algorithm',
  'game.hideAlgorithm': 'Hide algorithm',
  'game.locked': 'Locked',
  'game.free': 'Free',
  'game.moves': 'Moves: {{count}}',
  'game.caseSolved': 'Case solved!',
  'game.cubeSolved': 'Cube solved!',
  'game.result': 'Time: {{time}} · Moves: {{count}}',
  'game.retryCase': 'Try this case again',
  'game.replay': 'Play again',
  'algo.dragToRotate': 'Drag to rotate',
  'algo.step': 'Step {{current}} / {{total}}',
  'algo.start': 'Start',
  'algo.previous': 'Prev.',
  'algo.play': 'Play',
  'algo.pause': 'Pause',
  'algo.replay': 'Replay',
  'algo.next': 'Next',
  'algo.titleBack': 'Back to start',
  'algo.titlePrevious': 'Previous move',
  'algo.titleNext': 'Next move',
  'algo.testOnCube': 'Try on the cube',
  'algo.return': 'Back',
  'algo.categoryMenu': 'Open category menu',
  'algo.categories': 'Categories',
  'algo.training': 'CFOP practice · 3x3',
  'algo.selectStage': 'Choose a stage',
  'algo.onlyToLearn': 'Show unlearned only',
  'algo.showAll': 'Show all',
  'algo.learnedCount': '{{count}} / {{total}} learned',
  'algo.markedLearned': 'Marked as learned',
  'algo.notMarkedLearned': 'Mark as learned',
  'algo.selectMethod': 'All Ortega',
  'algo.filter.allYau': 'All Yau',
  'bld.title': '3x3 blindfolded (Old Pochmann · Speffz)',
  'bld.interactivePattern': 'Interactive Speffz lettering scheme (A to X)',
  'bld.patternHelp': 'Select a letter to see its setup and 3D execution.',
  'bld.edges': 'Edges (buffer B → target D)',
  'bld.corners': 'Corners (buffer A → target P)',
  'bld.buffer': 'Buffer',
  'bld.target': 'Target',
  'bld.orientation': 'Orientation: white on top (U), green in front (F)',
  'bld.coreAlgorithms': 'The three core algorithms (edges, corners, and parity)',
  'bld.coreHelp': 'Blindfolded solving relies on these three algorithms derived from CFOP.',
  'bld.setups.edges': 'Edge setup table (buffer B → target D + T-perm)',
  'bld.setups.corners': 'Corner setup table (buffer A → target P + modified Y-perm)',
  'bld.setups.help': 'Select a letter to see the full sequence: setup, algorithm, and setup undo.',
  'bld.allFaces': 'All (24)',
  'bld.face': 'Face {{face}}',
  'bld.piece': 'Piece {{position}}',
  'bld.setup': 'Setup:',
  'bld.undo': 'Undo:',
  'bld.noSetup': 'None',
  'bld.viewSetup': 'View setup + algorithm',
  'bld.learnSetup': 'Mark setup as learned',
  'bld.edgesTab': 'Edges',
  'bld.cornersTab': 'Corners',
  'bld.tabGuide': '1. Guide and Speffz scheme',
  'bld.tabCore': '2. Algorithms (3)',
  'bld.tabEdges': '3. Edge setups (target D)',
  'bld.tabCorners': '4. Corner setups (target P)',
  'bld.roleBuffer': 'BUFFER',
  'bld.roleTarget': 'TARGET'
});

const stepTranslations = {
  s2_step1: {
    title: 'Step 1: Build the white face (the Elevator)',
    subtitle: 'Build the first white layer and match the side colors.',
    explanation: [
      'The 2x2 has only eight corners. Choose a white corner and keep it at the front-left on the bottom; this is your reference point. Check its side color (for example, green). The corner to its right must have both white and green.',
      'Place the white corner you want to insert directly above its slot at the front-right, then check which way its white sticker is facing:'
    ]
  },
  s2_step2: {
    title: 'Step 2: Orient the yellow face (Sune)',
    subtitle: 'Turn all yellow stickers upward with one algorithm.',
    explanation: [
      'Use the Sune algorithm (R U R\' U R U2 R\') to turn all yellow corners upward.',
      'Hold the cube as follows before performing the algorithm:\n• If one yellow corner faces up, place it at the front-left.\n• If no yellow corners face up, turn the top layer until a yellow sticker is on the left side.\n• If two yellow corners face up, turn the top layer until a yellow sticker faces you at the front-left.'
    ]
  },
  s2_step3: {
    title: 'Step 3: Swap the final corners',
    subtitle: 'Swap the last two corners to solve the cube.',
    explanation: [
      '1. Turn the top layer to match as many side colors as possible. Look for two adjacent corners with the same side color, forming a matching bar.',
      '2. Place the matching bar on your left and perform the algorithm below to swap the two right-hand corners. If there is no matching bar, perform the algorithm once to create one.'
    ]
  },
  step1_cross: {
    title: 'Step 1: Make a daisy, then the white cross',
    subtitle: 'Build the white cross by first arranging its edges around the yellow center.',
    explanation: [
      '1. Make a daisy: put the yellow center on top. Find the four white edge pieces (the middle pieces with two colors) and place them around the yellow center to make four white petals.',
      '2. Move each petal to the bottom: check the other color on a white edge (for example, green). Turn the top layer until that color matches its center, then turn that face twice (F2) to move the petal to the bottom.',
      '3. Repeat for all four petals. The white cross should now be complete and aligned with the side centers. If an edge is flipped or stuck on the side, use one of the cases below.'
    ]
  },
  step2_corners: {
    title: 'Step 2: Insert the four white corners (the Elevator)',
    subtitle: 'Complete the white face and its first matching layer.',
    explanation: [
      '1. Keep the white cross on the bottom. Find a top-layer corner with white, then check its other two colors (for example, green and red). Turn the top layer (U) to place it above the slot between the matching centers.',
      '2. Check which way the white sticker faces: right, toward you, or up. Use the matching Elevator algorithm:'
    ]
  },
  step3_belge: {
    title: 'Step 3: Solve the middle layer (the Belgian)',
    subtitle: 'Insert the four middle-layer edges with a simple mnemonic.',
    explanation: [
      '1. Keep the white face on the bottom. Find a top-layer edge without yellow. Turn the top layer until its front color matches the center below it, forming a T.',
      '2. Check whether the edge belongs on the right or left. Use this mnemonic:\n• The Belgian starts on the side opposite its destination.\n• His friends lift him up.\n• He returns, and his friends come back down with him.\n• Make one more turn, open the front face, restore the white corner, then close the face.'
    ]
  },
  step4_yellow_cross: {
    title: 'Step 4: Make the yellow cross (the 9 o\'clock pattern)',
    subtitle: 'Form a yellow cross on top with one short algorithm.',
    explanation: [
      'Look only at the yellow edges on top; ignore the corners for now. You will see a dot, an L shape, or a line.',
      'The algorithm is always F (R U R\' U\') F\':\n1. Turn the front face to the right (F).\n2. Perform one Elevator sequence (R U R\' U\').\n3. Restore the front face (F\').\n\n• For the L shape, hold it like a 9 o\'clock angle, with the edges at the top and left.\n• For the line, hold it horizontally.'
    ]
  },
  step5_yellow_edges: {
    title: 'Step 5: Align the yellow cross (the Chair)',
    subtitle: 'Match each yellow-cross edge with its side center.',
    explanation: [
      '1. Turn the top layer (U). You can always match at least two edges with their centers.',
      '2. If the two matching edges are adjacent, place them at the back and on the right. If they are opposite each other, perform the algorithm once from any position. Then use the Chair mnemonic:\n• He gets up from the chair (R).\n• He goes for a walk (U).\n• The chair falls over (R\').\n• He takes one more step (U).\n• He comes back and lifts the chair (R).\n• He runs back quickly (U2).\n• He sits down again (R\').' 
    ]
  },
  step6_yellow_corners_pos: {
    title: 'Step 6: Position the yellow corners (the Friends)',
    subtitle: 'Put each corner in its correct slot, even if it is not oriented yet.',
    explanation: [
      '1. A corner is correctly positioned when its three colors match the surrounding faces, even if the yellow sticker does not face up yet.',
      '2. If one corner is correctly positioned, keep it at the front-right. If none are, perform the algorithm once from any position. Then use the Friends mnemonic:\n• The right corner visits the left (U).\n• Its right-side friends lift it up (R).\n• It comes home (U\').\n• Its left-side friends lift it too (L\').\n• It turns back to greet them (U).\n• The right-side friends come down (R\').\n• It returns to its slot (U\'), and the left-side friends come down (L).'
    ]
  },
  step7_yellow_corners_orient: {
    title: 'Step 7: Orient the final corners (the Double Chair)',
    subtitle: 'The final step to solve the 3x3 Rubik\'s Cube.',
    explanation: [
      'All the corners are in the correct slots. Now twist them in place so the yellow stickers face up.',
      'Place the two corners to twist on your right, then perform the Double Chair:\n• First, the right-handed reverse Chair: (R U2 R\' U\' R U\' R\').\n• Then perform its mirror with the left hand: (L\' U2 L U L\' U L).'
    ]
  },
  s4_step1_centers: {
    title: 'Step 1: Build the six centers (2x2 blocks)',
    subtitle: 'Group the four center pieces of each color without mixing them.',
    explanation: [
      '1. Why start with the centers? On a 4x4, centers are not fixed. Each center is a 2x2 block made of four small pieces. Build the white center first, then the yellow center opposite it.',
      '2. The bar rule: do not place center pieces one at a time. First make a bar of two matching pieces, make a second bar, then join them.',
      '3. Side-color order: with white on the bottom and yellow on top, follow the official order as you turn right: red → green → orange → blue. Red is opposite orange; green is opposite blue.'
    ]
  },
  s4_step2_edges: {
    title: 'Step 2: Pair the edges',
    subtitle: 'Pair each matching edge to reduce the 4x4 to a 3x3.',
    explanation: [
      '1. Find two matching edge pieces (the same two colors, such as white and red) and place them on the front face, one on the left and one on the right.',
      '2. If the two pieces are on the same horizontal line, first flip one in place with the short algorithm (R U R\' F R\' F\' R).',
      '3. Once the pieces are offset (one above the other), turn the inner slice (Uw\') to pair them. Replace that edge with an unsolved top edge (R U R\'), then restore the centers (Uw).'
    ]
  },
  s4_step3_3x3: {
    title: 'Step 3: Solve it like a 3x3',
    subtitle: 'Use only the outer faces (R, L, U, D, F, B).',
    explanation: [
      'Great! The six centers are built and all 12 edge pairs are joined, so the 4x4 has been reduced to a large 3x3.',
      'From this point on, do not turn inner slices (Uw, Rw, and so on) on their own. Follow the same steps as for a 3x3:\n• White cross on the bottom\n• Four white corners (Elevator)\n• Middle layer (Belgian)\n• Yellow cross and last layer; you may encounter parity in Step 4.'
    ]
  },
  s4_step4_parity: {
    title: 'Step 4: Handle the two 4x4 parity cases',
    subtitle: 'Fix a flipped yellow edge (OLL parity) or a final edge swap (PLL parity).',
    explanation: [
      'On a 4x4, you have a one-in-two chance of encountering a case that cannot happen on a 3x3:',
      '• OLL parity: while making the yellow cross, three edges are oriented but the fourth is flipped. Hold the flipped edge at the front and perform the OLL parity algorithm.\n• PLL parity: at the end, everything is solved except two opposite edges (or two corners) that need to swap. Perform the short PLL parity algorithm.'
    ]
  },
  bld_step1: {
    title: '1. The basics: orientation and Speffz notation',
    subtitle: 'Learn the universal A-to-X lettering scheme across all six faces.',
    content: [
      'Keep the cube in a fixed orientation: white center on top (U) and green center facing you (F). Orange is on the left (L), red on the right (R), blue at the back (B), and yellow on the bottom (D).',
      'Speffz assigns four letters to each face, clockwise from the top-left corner or edge:\n• Top (U - white): A, B, C, D\n• Left (L - orange): E, F, G, H\n• Front (F - green): I, J, K, L\n• Right (R - red): M, N, O, P\n• Back (B - blue): Q, R, S, T\n• Bottom (D - yellow): U, V, W, X'
    ]
  },
  bld_step2: {
    title: '2. Buffers, targets, and execution algorithms',
    subtitle: 'Swap one piece at a time with the setup + algorithm + setup undo sequence.',
    content: [
      'In Old Pochmann, solve pieces one at a time from a fixed starting position (the buffer) to a fixed target:\n• Edges: the buffer is B (the white sticker on edge UR), and the target is D (the white sticker on edge UL). Swap them with a T-perm.\n• Corners: the buffer is A (the white sticker on corner UBL), and the target is P (the red sticker on corner DFR). Swap them with the modified Y-perm.',
      'To send the buffer to any letter:\n1. Perform that letter\'s setup move to bring it to the target without disturbing the buffer.\n2. Perform the swap algorithm (T-perm for an edge, modified Y-perm for a corner).\n3. Undo the setup move exactly.'
    ]
  },
  bld_step3: {
    title: '3. Tracing, memorization, and cycle breaks',
    subtitle: 'Build your letter sequence and handle closed cycles.',
    content: [
      'Tracing: check which letter is currently in the buffer (B for edges, A for corners). Write down the letter where that piece belongs. Then check which letter is in that position, write it down, and continue until the cycle closes.',
      'Cycle break: if tracing returns to a buffer piece (B or M for edges; A, E, or R for corners) before the cube is solved, the cycle is closed. Choose any letter belonging to an unsolved piece, send it to the buffer, and continue until you return to that piece.',
      'Flipped or twisted piece: if an edge is in the correct slot but flipped, solve it by adding its two letters (for example, C then I). Use the same idea for a twisted corner; two letters will orient it correctly.'
    ]
  },
  bld_step4: {
    title: '4. Parity (an odd number of letters)',
    subtitle: 'Correct the extra corner or edge swap caused by odd-length memorization.',
    content: [
      'Each T-perm swaps the target edge and the two right-hand corners. If you execute an even number of letters, these extra swaps cancel out.',
      'If you memorized an odd number of edge letters (and therefore an odd number of corner letters), you have parity. Perform the Ra-perm once after solving all edges and before starting the corners.'
    ]
  },
  bld_step5: {
    title: '5. A complete solve, from start to finish',
    subtitle: 'Follow this order to memorize and execute without missing a step.',
    content: [
      '1. Memorize the corners first. Group the letters in pairs (for example, K - B as “Koala Bear”) and make a vivid story to help you remember them.',
      '2. Memorize the edges next, using quick syllables or words for short-term memory.',
      '3. Put on the blindfold and solve the edges while they are still fresh: setup + T-perm + setup undo.',
      '4. If the number of letters was odd, perform the parity algorithm (Ra-perm).',
      '5. Finish by solving the corners from your memorized story: setup + modified Y-perm + setup undo.'
    ]
  }
};

for (const [id, step] of Object.entries(stepTranslations)) {
  for (const field of ['title', 'subtitle']) {
    messages[`data.step.${id}.${field}`] = step[field];
  }
  for (const [index, text] of (step.explanation || step.content).entries()) {
    const field = step.explanation ? 'explanation' : 'content';
    messages[`data.step.${id}.${field}.${index}`] = text;
  }
}

const caseTranslations = {
  s2_c1_right: {
    name: 'White facing right',
    description: 'The Elevator goes up (R), the corner goes in (U), and the Elevator comes back down (R\').'
  },
  s2_c1_front: {
    name: 'White facing you',
    description: 'Move the corner aside (U), raise the Elevator (R), insert the corner (U\'), then lower the Elevator (R\').'
  },
  s2_c1_up: {
    name: 'White facing up (three Elevators)',
    description: 'Repeat three times: raise the Elevator (R), turn the top (U), lower the Elevator (R\'), and restore the top (U\').'
  },
  s2_sune: {
    name: 'The Chair (Sune)',
    description: 'He gets up (R), walks away (U), the chair falls (R\'), he takes a step (U), lifts the chair (R), hurries back (U2), and sits down again (R\').'
  },
  s2_niklas_swap: {
    name: 'Swap the two right-hand corners',
    description: 'Keep the solved bar on the left and swap the two right-hand corners.'
  },
  s3_cross_flip: {
    name: 'Flip a white petal',
    description: 'Use this when the white edge is in the correct slot but its white sticker faces forward instead of up.'
  },
  s3_cross_insert: {
    name: 'Bring an edge out of the middle layer',
    description: 'Moves the edge on the right up without disturbing the petals already in place.'
  },
  s3_c1_right: {
    name: 'White facing right (direct Elevator)',
    description: 'Raise the right-side Elevator (R), insert the corner (U), then lower the Elevator (R\').'
  },
  s3_c1_front: {
    name: 'White facing you',
    description: 'Move the corner left (U), raise the Elevator (R), insert the corner (U\'), then lower the Elevator (R\').'
  },
  s3_c1_up: {
    name: 'White facing up (three Elevators)',
    description: 'Repeat three times: raise the Elevator (R), turn the top (U), lower the Elevator (R\'), and restore the top (U\').'
  },
  s3_belge_droite: {
    name: 'The Belgian goes right',
    description: 'To go right, he starts on the left (U). The right side goes up (R), he comes back (U\'), the right side comes down (R\'), then restore the white corner (U\' F\' U F).'
  },
  s3_belge_gauche: {
    name: 'The Belgian goes left',
    description: 'To go left, he starts on the right (U\'). The left side goes up (L\'), he comes back (U), the left side comes down (L), then restore the white corner (U F U\' F\').'
  },
  s3_yc_line: {
    name: 'From the horizontal line',
    description: 'Hold the line horizontally, from left to right, and perform the algorithm once.'
  },
  s3_yc_l: {
    name: 'From the 9 o\'clock L shape',
    description: 'Hold the yellow L at the top-left (9 o\'clock) and perform the two Elevator sequences in the middle.'
  },
  s3_chair: {
    name: 'The Chair',
    description: 'Swaps the two front and left edges while leaving the back and right edges in place.'
  },
  s3_friends: {
    name: 'The Friends (Niklas)',
    description: 'Cycles three corners while keeping the front-right corner fixed.'
  },
  s3_double_chair: {
    name: 'The Double Chair',
    description: 'Twists the two right-hand corners in place without disturbing anything else.'
  },
  s4_center_swap: {
    name: 'Insert a bar without breaking the other centers',
    description: 'Raise the right half with the bar (Rw), turn the top twice (U2) to swap it with the other bar, then lower it (Rw\').'
  },
  s4_center_last: {
    name: 'Swap two pieces between the top and front centers',
    description: 'This is the Chair (Sune) with a wide turn (Rw), useful for finishing the last two centers.'
  },
  s4_edge_pair_basic: {
    name: 'Pair two edges (slice, replace, restore)',
    description: 'Turn the inner slice (Uw\') to pair the edges, replace the pair with another edge using (R U R\'), then restore the centers (Uw).'
  },
  s4_edge_flip: {
    name: 'Flip the right edge and pair the last two',
    description: 'For the final two edge pairs, place them opposite each other on the same line and perform this algorithm.'
  },
  s4_3x3_belge: {
    name: 'Reminder: the Belgian goes right on a 4x4',
    description: 'The two pieces of the edge move together as one 3x3 edge.'
  },
  s4_oll_parity: {
    name: 'OLL parity (flip one yellow edge)',
    description: 'Hold the misoriented edge facing you and follow the rhythm: only U2 half-turns between Rw/Lw moves.'
  },
  s4_pll_parity: {
    name: 'PLL parity (swap two opposite edges)',
    description: 'Swaps the front and back edge pairs (2R2 means turn only the inner right slice twice).'
  },
  ort_f1_right: {
    name: 'Right insertion',
    description: 'Insert the front-right corner into the bottom layer.'
  },
  ort_f1_front: {
    name: 'Front insertion',
    description: 'Insert a corner whose white sticker faces you.'
  },
  ort_f1_up: {
    name: 'White facing up',
    description: 'Orient and insert a corner with its white sticker facing up.'
  },
  ort_pbl_diag_diag: {
    name: 'Diagonal / diagonal (no bars)',
    description: 'There is no bar on either layer; this swaps corners diagonally on both layers.'
  },
  ort_pbl_adj_adj: {
    name: 'Adjacent / adjacent (two bars in front)',
    description: 'There is one bar on each layer; place both bars facing you.'
  },
  ort_pbl_adj_diag: {
    name: 'Top adjacent / bottom diagonal',
    description: 'There is a bar on top (place it facing you) and no bar on the bottom.'
  },
  ort_pbl_diag_adj: {
    name: 'Top diagonal / bottom adjacent',
    description: 'There is no bar on top and one on the bottom; place the bottom bar facing you.'
  },
  ort_pbl_j: {
    name: 'Top adjacent / bottom solved (J-perm)',
    description: 'The bottom layer is solved, with one bar on the left of the top layer.'
  },
  ort_pbl_y: {
    name: 'Top diagonal / bottom solved (Y-perm)',
    description: 'The bottom layer is solved; swap the top corners diagonally.'
  },
  yau_opp_center: {
    name: 'Second opposite center (yellow)',
    description: 'Insert the second bar into the top center without breaking the bottom center.'
  },
  yau_cross_edge: {
    name: 'Pair and place a cross edge',
    description: 'Pair a white edge and insert it into the cross while keeping one slot open.'
  },
  yau_center_sune: {
    name: 'Bar swap (Rw-Sune)',
    description: 'Swap two center pieces between faces U and F without disturbing the three cross edges.'
  },
  yau_center_comm: {
    name: 'Insert a side bar',
    description: 'Complete the last two adjacent centers while keeping the three cross edges intact.'
  },
  yau_last_cross: {
    name: 'Fourth cross edge',
    description: 'Pair the fourth white edge, then insert it to complete the cross.'
  },
  yau_323_cycle: {
    name: 'Cycle two pairs (Uw back and forth)',
    description: 'Offset Uw to make a pair on the right, insert the next piece, then undo Uw to make the second pair.'
  },
  yau_last_2_edges: {
    name: 'Final two pairs (flip algorithm)',
    description: 'Solves the last two edges, which sit opposite each other in the front-right and front-left slots.'
  },
  yau_oll_lucas: {
    name: 'Lucas parity (standard speed algorithm)',
    description: 'A fast OLL parity algorithm used in competition, with Rw/U2 finger tricks.'
  },
  yau_oll_pure: {
    name: 'Pure OLL parity (double flip)',
    description: 'A variant without an x rotation to flip the front edge.'
  },
  yau_pll_opp: {
    name: 'Opposite PLL parity (pure)',
    description: 'Swaps the two opposite edges (UF and UB).'
  },
  yau_pll_adj: {
    name: 'Adjacent PLL parity',
    description: 'Swaps two adjacent edges (UF and UR) using a setup Sexy Move.'
  },
  yau_pll_diag_corners: {
    name: 'Swap two adjacent corners (T-perm + parity)',
    description: 'Swaps only the two right-hand corners (PLL parity combined with a T-perm).'
  },
  bld_edge_tperm: {
    name: 'Edge swap (T-perm)',
    description: 'Swaps buffer B (UR) with target D (UL), while also swapping the two right-hand corners (UFR ↔ UBR).'
  },
  bld_corner_yperm: {
    name: 'Corner swap (modified Y-perm)',
    description: 'Without the opening F or final F\', this Y-perm swaps buffer A (UBL) directly with target P (the red sticker on DFR), while also swapping edges UB and UL.'
  },
  bld_parity_raperm: {
    name: 'Parity algorithm (Ra-perm)',
    description: 'Perform this after the edges and before the corners only when you memorized an odd number of letters.'
  }
};

for (const [id, fields] of Object.entries(caseTranslations)) {
  for (const [field, value] of Object.entries(fields)) {
    messages[`data.case.${id}.${field}`] = value;
  }
}

const groupTranslations = {
  'data.group.ortega.FACE1.title': 'Step 1: Build a face (no need to solve the layer)',
  'data.group.ortega.FACE1.description': 'In Ortega, the first face (usually white) does not need to be solved as a layer. The corners can be permuted incorrectly, which lets you build the face in just three to five moves.',
  'data.group.ortega.OLL.title': 'Step 2: OLL on the 2x2 (orient the opposite face: 7 cases)',
  'data.group.ortega.OLL.description': 'Orient all yellow corners in one algorithm using one of these seven cases:',
  'data.group.ortega.PBL.title': 'Step 3: PBL (permute both layers at once)',
  'data.group.ortega.PBL.description': 'Count the matching color bars on the top (U) and bottom (D) layers:',
  'data.group.yau.CENTERS_CROSS.title': 'Steps 1 and 2: Two opposite centers and three cross edges',
  'data.group.yau.CENTERS_CROSS.description': 'With Yau, solve the white and yellow centers, then place three white cross edges in their final positions on the D face, leaving one slot open to work with.',
  'data.group.yau.LAST_CENTERS.title': 'Step 3: The last four centers (half-centers and commutators)',
  'data.group.yau.LAST_CENTERS.description': 'Using only the Rw slice and U face, solve the four side centers without disturbing the three cross edges, taking advantage of the open cross slot.',
  'data.group.yau.PAIRING_323.title': 'Step 4: Finish the cross and pair edges in a 3-2-3 sequence',
  'data.group.yau.PAIRING_323.description': 'Once the fourth cross edge is in place on the bottom, pair the last eight edges in three quick passes (three, then two, then three) using Uw / Uw\'. Then move straight on to F2L.',
  'data.group.yau.OLL_PARITY.title': 'Step 5: OLL parity (Lucas parity)',
  'data.group.yau.OLL_PARITY.description': 'After F2L, if an odd number of yellow edges are oriented (one or three), perform the standard Lucas parity algorithm.',
  'data.group.yau.PLL_PARITY.title': 'Step 6: PLL parity and combinations',
  'data.group.yau.PLL_PARITY.description': '4x4 last-layer permutation cases: swap two opposite or adjacent edges, or two corners.',
  'data.group.cfop.PLL.0': 'Edge-only permutations',
  'data.group.cfop.PLL.1': 'Corner-only permutations',
  'data.group.cfop.PLL.2': 'Swap two adjacent corners',
  'data.group.cfop.PLL.3': 'Swap two diagonal corners',
  'data.group.cfop.PLL.4': 'G-perms (double cycles)',
  'data.group.cfop.2-LOOK OLL.0': 'Step 1: Orient the edges (yellow cross)',
  'data.group.cfop.2-LOOK OLL.1': 'Step 2: Orient the corners (OCLL)',
  'data.group.cfop.OLL.0': 'Oriented cross (OCLL)',
  'data.group.cfop.OLL.1': 'T shapes',
  'data.group.cfop.OLL.2': 'Squares',
  'data.group.cfop.OLL.3': 'C shapes',
  'data.group.cfop.OLL.4': 'W shapes',
  'data.group.cfop.OLL.5': 'Correct corners, flipped edges',
  'data.group.cfop.OLL.6': 'P shapes',
  'data.group.cfop.OLL.7': 'I shapes',
  'data.group.cfop.OLL.8': 'Fish shapes',
  'data.group.cfop.OLL.9': 'Knight shapes',
  'data.group.cfop.OLL.10': 'Irregular shapes',
  'data.group.cfop.OLL.11': 'L shapes',
  'data.group.cfop.OLL.12': 'Lightning bolts',
  'data.group.cfop.OLL.13': 'No correctly oriented edges',
  'data.group.cfop.F2L.0': 'Basic inserts',
  'data.group.cfop.F2L.1': 'White sticker on the side, different colors on top',
  'data.group.cfop.F2L.2': 'White sticker on the side, matching colors on top',
  'data.group.cfop.F2L.3': 'White sticker on top, edge on top',
  'data.group.cfop.F2L.4': 'Pieces on top, incorrectly paired',
  'data.group.cfop.F2L.5': 'Corner in the slot (bottom layer)',
  'data.group.cfop.F2L.6': 'Edge in the slot (middle layer)',
  'data.group.cfop.F2L.7': 'Corner and edge already in the slot',
  'data.group.cfop.2-LOOK PLL.0': 'Step 1: Permute the corners (diagonal or adjacent)',
  'data.group.cfop.2-LOOK PLL.1': 'Step 2: Permute the edges (Ua, Ub, Z, H)',
  'data.section.ortega.ALL': 'All Ortega cases',
  'data.section.ortega.FACE1': '1. First face',
  'data.section.ortega.OLL': '2. OLL (7 cases)',
  'data.section.ortega.PBL': '3. PBL (5 + 2 cases)',
  'data.section.yau.ALL': 'All Yau cases',
  'data.section.yau.CENTERS_CROSS': '1. Centers and three cross edges',
  'data.section.yau.LAST_CENTERS': '2. Last four centers',
  'data.section.yau.PAIRING_323': '3. 3-2-3 edge pairing',
  'data.section.yau.OLL_PARITY': '4. OLL parity',
  'data.section.yau.PLL_PARITY': '5. PLL parity',
  'data.section.bld.GUIDE': '1. Guide and Speffz scheme',
  'data.section.bld.CORE_ALGOS': '2. Core algorithms (3)',
  'data.section.bld.EDGES_SETUP': '3. Edge setups (target D)',
  'data.section.bld.CORNERS_SETUP': '4. Corner setups (target P)',
  'data.section.cfop.F2L': 'F2L',
  'data.section.cfop.2-LOOK OLL': '2-LOOK OLL',
  'data.section.cfop.OLL': 'OLL (57)',
  'data.section.cfop.2-LOOK PLL': '2-LOOK PLL',
  'data.section.cfop.PLL': 'PLL (21)',
  'data.face.bld.U': 'U (top - white)',
  'data.face.bld.L': 'L (left - orange)',
  'data.face.bld.F': 'F (front - green)',
  'data.face.bld.R': 'R (right - red)',
  'data.face.bld.B': 'B (back - blue)',
  'data.face.bld.D': 'D (bottom - yellow)'
};

Object.assign(messages, groupTranslations);

const categoryTranslations = {
  '2x2 Simple - Étape 1': '2x2 beginner - step 1',
  '2x2 Simple - Étape 2': '2x2 beginner - step 2',
  '2x2 Simple - Étape 3': '2x2 beginner - step 3',
  'Étape 1 - Croix': 'Step 1 - Cross',
  'Étape 2 - 1ère Couronne': 'Step 2 - First layer',
  'Étape 3 - 2ème Couronne': 'Step 3 - Middle layer',
  'Étape 4 - Croix Jaune': 'Step 4 - Yellow cross',
  'Étape 5 - Arêtes Jaunes': 'Step 5 - Yellow edges',
  'Étape 6 - Placer les Coins': 'Step 6 - Position the corners',
  'Étape 7 - Orienter les Coins': 'Step 7 - Orient the corners',
  '4x4 Simple - Étape 1': '4x4 beginner - step 1',
  '4x4 Simple - Étape 2': '4x4 beginner - step 2',
  '4x4 Simple - Étape 3': '4x4 beginner - step 3',
  '4x4 Simple - Étape 4': '4x4 beginner - step 4',
  'Ortega - Face 1': 'Ortega - first face',
  'Ortega - OLL': 'Ortega - OLL',
  'Ortega - PBL': 'Ortega - PBL',
  'Yau - Centres': 'Yau - centers',
  'Yau - Croix': 'Yau - cross',
  'Yau - 4 Centres': 'Yau - four centers',
  'Yau - Croix finale': 'Yau - final cross edge',
  'Yau - 3-2-3 Pairing': 'Yau - 3-2-3 pairing',
  'Yau - Parité OLL': 'Yau - OLL parity',
  'Yau - Parité PLL': 'Yau - PLL parity',
  'BLD - Arêtes (Buffer B ↔ Cible D)': 'BLD - edges (buffer B ↔ target D)',
  'BLD - Coins (Buffer A ↔ Cible P)': 'BLD - corners (buffer A ↔ target P)',
  'BLD - Parité (Entre Arêtes et Coins)': 'BLD - parity (between edges and corners)'
};

for (const [key, value] of Object.entries(frenchMessages)) {
  if (key.startsWith('data.case.') && key.endsWith('.category')) {
    messages[key] = categoryTranslations[value] || value;
  }
  if (key.startsWith('data.case.') && key.endsWith('.name') && messages[key] === '') {
    messages[key] = value;
  }
  if (key.startsWith('data.case.') && key.endsWith('.pos')) {
    messages[key] = value;
  }
}

const speffzColors = {
  U: 'white',
  L: 'orange',
  F: 'green',
  R: 'red',
  B: 'blue',
  D: 'yellow'
};

for (const [index, item] of EDGE_SETUPS.entries()) {
  const face = item.face[0];
  messages[`data.case.${item.id}.name`] = `Edge ${item.letter} (${item.pos})`;
  messages[`data.case.${item.id}.category`] = `BLD edge · face ${face} (${speffzColors[face]})`;
  messages[`data.case.${item.id}.face`] = `${face} (${speffzColors[face]})`;
  messages[`data.case.${item.id}.pos`] = item.pos;
  messages[`data.case.${item.id}.note`] = [
    'Bring A to target D without disturbing buffer B.',
    'Buffer piece (with M); never execute this setup.',
    'Bring C to target D.',
    'Direct target: no setup; perform the T-perm directly.',
    'Same edge as D, oriented toward the orange face.',
    'Turn the equatorial slice, then move the edge up to D.',
    'Move the edge to LF, then perform Dw\' L.',
    'Move the back slice to the left.',
    'Same edge as C, oriented toward the green face.',
    'Half-turn Dw2, then move the edge up with L.',
    'Lower with Lw, then align with D L2.',
    'Direct insertion in one move.',
    'Side sticker of buffer B (edge UR).',
    'Turn Dw, then move the edge up with L.',
    'Bring RD to the left, then orient it toward D.',
    'Turn Dw\', then move the edge up with L\'.',
    'Same edge as A, oriented toward the blue face.',
    'Turn Lw\', then perform D\' L2.',
    'Half-turn Dw2, then move the edge up with L\'.',
    'Align below L, then move the edge up with L2.',
    'Turn the bottom layer twice, then perform L2.',
    'Quarter-turn D, then perform L2.',
    'Move the edge up directly with L2.',
    'Target piece (with M); never execute this setup.'
  ][index];
}

for (const [index, item] of CORNER_SETUPS.entries()) {
  const face = item.face[0];
  messages[`data.case.${item.id}.name`] = `Corner ${item.letter} (${item.pos})`;
  messages[`data.case.${item.id}.category`] = `BLD corner · face ${face} (${speffzColors[face]})`;
  messages[`data.case.${item.id}.face`] = `${face} (${speffzColors[face]})`;
  messages[`data.case.${item.id}.pos`] = item.pos;
  messages[`data.case.${item.id}.note`] = [
    'Buffer piece (with E and R); never execute this setup.',
    'Move corner UBR to target P.',
    'One move to target P.',
    'Move the corner down, then place it on P.',
    'Orange sticker of buffer A (corner UBL).',
    'Half-turn F2 directly to P.',
    'Half-turn D2, then perform R.',
    'Half-turn D2 directly to P.',
    'Move down with F\', then align with D toward P.',
    'Half-turn F2, then perform D toward P.',
    'Same corner as P, oriented toward the green face.',
    'Quarter-turn D directly toward P.',
    'Quarter-turn R\' directly toward P.',
    'Half-turn R2 directly toward P.',
    'Quarter-turn R directly toward P.',
    'Direct target: no setup; perform the modified Y-perm directly.',
    'Bring the back-right corner to P.',
    'Blue sticker of buffer A (corner UBL).',
    'Align on the bottom, then move up with R.',
    'Bring BDR to target P.',
    'Quarter-turn F\' directly toward P.',
    'Same corner as P, oriented toward the yellow face.',
    'Half-turn D2, then perform F\'.',
    'Quarter-turn D, then perform F\'.'
  ][index];
}

export default messages;
