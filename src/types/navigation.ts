export type NavigationMenuItem = {
  title: string;
};

export type NetworkEntity = {
  name: string;
  type: "PEER" | "LINK" | "OBSTACLE";
  locked?: boolean;
};
