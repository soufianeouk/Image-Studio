export async function createDemo(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 2000;
  canvas.height = 1400;
  const c = canvas.getContext("2d")!;
  const sky = c.createLinearGradient(0, 0, 0, 1400);
  sky.addColorStop(0, "#bfcac1");
  sky.addColorStop(0.6, "#e8e5ce");
  sky.addColorStop(1, "#f0d7a5");
  c.fillStyle = sky;
  c.fillRect(0, 0, 2000, 1400);
  c.fillStyle = "#f7e7bb";
  c.beginPath();
  c.arc(1450, 370, 150, 0, Math.PI * 2);
  c.fill();
  const mountain = (points: number[][], color: string) => {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, 1400);
    for (const [x, y] of points) c.lineTo(x, y);
    c.lineTo(2000, 1400);
    c.closePath();
    c.fill();
  };
  mountain(
    [
      [0, 690],
      [280, 530],
      [460, 590],
      [840, 240],
      [1100, 560],
      [1400, 720],
      [1750, 430],
      [2000, 650],
    ],
    "#8d9f93",
  );
  mountain(
    [
      [0, 960],
      [450, 620],
      [850, 910],
      [1250, 540],
      [1550, 720],
      [1800, 840],
      [2000, 730],
    ],
    "#627d70",
  );
  c.fillStyle = "#dfdfc9";
  c.beginPath();
  c.moveTo(660, 409);
  c.lineTo(840, 240);
  c.lineTo(980, 413);
  c.lineTo(856, 354);
  c.lineTo(803, 411);
  c.lineTo(774, 367);
  c.fill();
  const water = c.createLinearGradient(0, 920, 0, 1400);
  water.addColorStop(0, "#9aafa0");
  water.addColorStop(1, "#48695d");
  c.fillStyle = water;
  c.fillRect(0, 980, 2000, 420);
  c.globalAlpha = 0.18;
  c.fillStyle = "#e7e2bd";
  for (let i = 0; i < 35; i++)
    c.fillRect(1350 - i * 12, 1000 + i * 12, 160 + i * 18, 2 + i / 8);
  c.globalAlpha = 1;
  mountain(
    [
      [0, 900],
      [150, 1030],
      [260, 1110],
      [390, 1190],
      [520, 1400],
    ],
    "#314e42",
  );
  const tree = (x: number, y: number, size: number) => {
    c.fillStyle = "#233f34";
    c.fillRect(x - size * 0.025, y - size, size * 0.05, size);
    for (let i = 0; i < 5; i++) {
      const top = y - size + i * size * 0.16;
      const w = size * (0.13 + i * 0.055);
      c.beginPath();
      c.moveTo(x, top - size * 0.18);
      c.lineTo(x - w, top + size * 0.3);
      c.lineTo(x + w, top + size * 0.3);
      c.fill();
    }
  };
  tree(120, 1180, 430);
  tree(280, 1310, 350);
  tree(45, 1350, 510);
  tree(1880, 1420, 290);
  tree(1980, 1390, 410);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  canvas.width = 1;
  canvas.height = 1;
  if (!blob) throw new Error("Could not create the example image.");
  return new File([blob], "alpine-escape.png", { type: "image/png" });
}
