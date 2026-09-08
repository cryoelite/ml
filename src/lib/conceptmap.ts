/* ============================================================================
   The map of the territory.

   A linear book has to pick an order, and any order hides the shape of the
   field. This tree is the antidote: it is the one place where you can see, at
   once, that "supervised learning", "a decision tree" and "gradient descent"
   are not three items on one list — they answer three different questions.

   Three axes hang off machine learning, deliberately:
     · what the feedback signal looks like   (supervision)
     · what the learned function looks like  (model family)
     · what makes the learning happen at all (machinery)

   `chapter` links a node to where the tutorial teaches it.
   Nodes with no chapter are drawn dashed: they exist, they matter to somebody,
   and you can leave without them.
   ========================================================================== */

export interface MapNode {
  id: string;
  label: string;
  /** Slug of the chapter that teaches this, if any. */
  chapter?: string;
  /** One line shown on hover — the "so what" of the node. */
  note: string;
  kind?: "root" | "era" | "leaf";
  children?: MapNode[];
}

export const CONCEPT_MAP: MapNode = {
  id: "task",
  label: "Get a computer to do a task",
  kind: "root",
  note: "Every branch below is an answer to: where do the rules come from?",
  children: [
    {
      id: "classical",
      label: "You write the rules",
      chapter: "01-where-this-fits",
      note: "A normal program. Deterministic, auditable, and hopeless at tasks nobody can specify.",
    },
    {
      id: "ml",
      label: "Rules are fitted to data — machine learning",
      kind: "era",
      chapter: "01-where-this-fits",
      note: "You supply examples and a way to score answers; search finds the rules.",
      children: [
        {
          id: "supervision",
          label: "① What feedback do you get?",
          kind: "era",
          chapter: "03-the-shape-of-problems",
          note: "The axis that decides what data you must collect.",
          children: [
            {
              id: "supervised",
              label: "Supervised",
              chapter: "03-the-shape-of-problems",
              note: "Every example carries the right answer. Most of what works commercially.",
              children: [
                { id: "classification", label: "Classification", chapter: "04-your-first-model", note: "Pick one of k labels. Spam / not spam, which of 37 breeds." },
                { id: "regression", label: "Regression", chapter: "04-your-first-model", note: "Predict a number. Price, temperature, time-to-failure." },
                { id: "ranking", label: "Ranking", note: "Order a list. Search results, recommendations. Its own loss functions." },
              ],
            },
            {
              id: "unsupervised",
              label: "Unsupervised",
              chapter: "03-the-shape-of-problems",
              note: "No labels. Find structure that was already there.",
              children: [
                { id: "clustering", label: "Clustering", chapter: "15-unsupervised-and-the-rest", note: "Group similar things. k-means, DBSCAN, hierarchical." },
                { id: "dimred", label: "Dimensionality reduction", chapter: "15-unsupervised-and-the-rest", note: "Squeeze many columns into few. PCA, UMAP, autoencoders." },
                { id: "density", label: "Density estimation", note: "Model where the data lives. Anomaly detection falls out of it." },
              ],
            },
            {
              id: "selfsup",
              label: "Self-supervised",
              chapter: "13-attention-and-transformers",
              note: "Hide part of the input, predict it. The trick that unlocked LLMs.",
            },
            {
              id: "rl",
              label: "Reinforcement learning",
              note: "Learn from delayed reward, not from answers. Control, games, and RLHF.",
              children: [
                { id: "rlhf", label: "RLHF / DPO", chapter: "14-llms", note: "How a raw language model is turned into an assistant." },
              ],
            },
          ],
        },

        {
          id: "family",
          label: "② What shape is the learned function?",
          kind: "era",
          chapter: "07-the-model-zoo",
          note: "The axis that decides your accuracy ceiling and your compute bill.",
          children: [
            {
              id: "linear",
              label: "Linear models",
              chapter: "04-your-first-model",
              note: "Weighted sum plus bias. The atom every deep net is built from.",
              children: [
                { id: "logreg", label: "Logistic regression", chapter: "04-your-first-model", note: "A linear model squashed into a probability. Still the right first try." },
                { id: "regularised", label: "Ridge / Lasso", chapter: "06-generalisation", note: "Linear models with a penalty for being complicated." },
              ],
            },
            {
              id: "trees",
              label: "Trees & ensembles",
              chapter: "07-the-model-zoo",
              note: "Still the best default on tabular data. Not everything is deep learning.",
              children: [
                { id: "cart", label: "Decision tree", chapter: "07-the-model-zoo", note: "Nested if-statements, chosen by a greedy split criterion." },
                { id: "rf", label: "Random forest", chapter: "07-the-model-zoo", note: "Average many decorrelated trees. Almost unfailingly reasonable." },
                { id: "gbm", label: "Gradient boosting", chapter: "07-the-model-zoo", note: "Fit each tree to the previous ensemble's mistakes. XGBoost, LightGBM." },
              ],
            },
            { id: "knn", label: "Nearest neighbours", chapter: "07-the-model-zoo", note: "No training at all: just look up similar examples. Underpins vector search." },
            { id: "svm", label: "Kernel methods (SVM)", note: "Bend the space until the classes separate. Dominant until ~2012." },
            { id: "bayes", label: "Probabilistic models", note: "Naive Bayes, HMMs, Gaussian processes. Calibrated uncertainty, small data." },
            {
              id: "nn",
              label: "Neural networks → deep learning",
              kind: "era",
              chapter: "08-neural-networks",
              note: "Stack linear layers with a nonlinearity between them; learn the features too.",
              children: [
                { id: "mlp", label: "MLP / dense net", chapter: "08-neural-networks", note: "The plain stack. Every other architecture is this plus a structural prior." },
                { id: "cnn", label: "Convolutional nets", chapter: "11-vision-and-transfer", note: "Weight sharing over space. Assumes nearby pixels belong together." },
                {
                  id: "rnn",
                  label: "Recurrent nets",
                  chapter: "13-attention-and-transformers",
                  note: "Weight sharing over time. Superseded for text, alive in streaming and control.",
                  children: [{ id: "lstm", label: "LSTM / GRU", note: "Gated memory that survives long sequences. The 1997 fix for vanishing gradients." }],
                },
                { id: "embed", label: "Embeddings", chapter: "12-embeddings-and-tabular", note: "Learned coordinates for discrete things. Words, users, SKUs, molecules." },
                {
                  id: "transformer",
                  label: "Transformer",
                  kind: "era",
                  chapter: "13-attention-and-transformers",
                  note: "Attention instead of recurrence: every position sees every other, in parallel.",
                  children: [
                    { id: "encoder", label: "Encoder-only (BERT)", chapter: "13-attention-and-transformers", note: "Reads whole inputs. Classification, retrieval, embeddings." },
                    { id: "decoder", label: "Decoder-only (GPT, LLMs)", chapter: "14-llms", note: "Predicts the next token. Everything you call an LLM." },
                    { id: "encdec", label: "Encoder-decoder (T5)", note: "Read one sequence, write another. Translation, summarisation." },
                    { id: "vit", label: "Vision transformer", chapter: "11-vision-and-transfer", note: "Cut an image into patches and treat them as tokens." },
                  ],
                },
                { id: "autoenc", label: "Autoencoders / VAE", chapter: "15-unsupervised-and-the-rest", note: "Compress then reconstruct. The learned bottleneck is the useful part." },
                { id: "gan", label: "GANs", note: "Generator versus critic. Beaten by diffusion for images; the idea persists." },
                { id: "diffusion", label: "Diffusion models", note: "Learn to undo noise, step by step. Image, audio and video generation." },
                { id: "gnn", label: "Graph neural nets", note: "Message passing over edges. Molecules, fraud rings, road networks." },
              ],
            },
          ],
        },

        {
          id: "machinery",
          label: "③ What makes the fitting work?",
          kind: "era",
          chapter: "05-how-learning-happens",
          note: "Independent of the two axes above — you need all of this whatever you pick.",
          children: [
            { id: "loss", label: "Loss function", chapter: "05-how-learning-happens", note: "The number you are allowed to minimise. Choosing it is choosing the goal." },
            { id: "gd", label: "Gradient descent", chapter: "05-how-learning-happens", note: "Roll downhill. SGD, momentum, Adam are refinements of one idea." },
            { id: "backprop", label: "Backpropagation / autodiff", chapter: "09-backpropagation", note: "The chain rule, applied mechanically. The reason deep nets are trainable." },
            { id: "generalise", label: "Generalisation & validation", chapter: "06-generalisation", note: "The difference between memorising and learning. Where projects actually die." },
            { id: "regular", label: "Regularisation", chapter: "06-generalisation", note: "Dropout, weight decay, augmentation, early stopping. Deliberate handicaps." },
            { id: "transfer", label: "Transfer learning", chapter: "11-vision-and-transfer", note: "Start from someone else's weights. Why you need 200 images, not 2 million." },
            { id: "scaling", label: "Scaling laws", chapter: "14-llms", note: "Loss falls predictably with compute, data and parameters. Why anyone spent the money." },
            { id: "eval", label: "Metrics & evaluation", chapter: "16-shipping-and-reading-papers", note: "Accuracy is usually the wrong number. Picking the right one is the job." },
            { id: "deploy", label: "Serving & drift", chapter: "16-shipping-and-reading-papers", note: "The model is a function; you already know how to ship functions." },
          ],
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Layout: a tidy left-to-right tree                                          */
/* -------------------------------------------------------------------------- */

export interface Positioned {
  node: MapNode;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
}

export interface Edge {
  x1: number; y1: number; x2: number; y2: number;
}

const CHAR_W = 6.15;      // measured for Inter at 11.5px
const PAD_X = 11;
const ROW_H = 25;
const ROW_GAP = 6;
const COL_GAP = 34;

/**
 * Reingold–Tilford, simplified: depth fixes x, and y is the midpoint of a
 * node's children (or the next free row, for a leaf). Good enough for a tree
 * that a human is meant to read rather than admire.
 */
export function layout(root: MapNode) {
  const nodes: Positioned[] = [];
  const edges: Edge[] = [];

  // Column x positions come from the widest label at each depth.
  const widths: number[] = [];
  const measure = (n: MapNode, d: number) => {
    const w = Math.round(n.label.length * CHAR_W + PAD_X * 2);
    widths[d] = Math.max(widths[d] ?? 0, w);
    n.children?.forEach((c) => measure(c, d + 1));
  };
  measure(root, 0);

  const colX: number[] = [];
  let acc = 2;
  for (let d = 0; d < widths.length; d++) {
    colX[d] = acc;
    acc += widths[d] + COL_GAP;
  }

  let cursor = 0;
  const place = (n: MapNode, d: number): Positioned => {
    let y: number;
    let kids: Positioned[] = [];
    if (n.children?.length) {
      kids = n.children.map((c) => place(c, d + 1));
      y = (kids[0].y + kids[kids.length - 1].y) / 2;
    } else {
      y = cursor;
      cursor += ROW_H + ROW_GAP;
    }
    const p: Positioned = { node: n, x: colX[d], y, w: widths[d], h: ROW_H, depth: d };
    nodes.push(p);
    for (const k of kids) {
      edges.push({
        x1: p.x + p.w,
        y1: p.y + ROW_H / 2,
        x2: k.x,
        y2: k.y + ROW_H / 2,
      });
    }
    return p;
  };
  place(root, 0);

  return {
    nodes,
    edges,
    width: acc,
    height: cursor + ROW_H,
  };
}
