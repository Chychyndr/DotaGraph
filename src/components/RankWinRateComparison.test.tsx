import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RankWinRateComparison } from "./RankWinRateComparison";

afterEach(cleanup);

describe("rank comparison", () => {
  it("shows two distinct source-hero rates, counts and a signed difference", () => {
    render(<RankWinRateComparison sourceName="Viper" minimumSample={500} rates={{
      ancient: { sourceWinRate: 0.6, sampleSize: 1200 },
      divinePlus: { sourceWinRate: 0.575, sampleSize: 800 }
    }} />);
    expect(screen.getByRole("region", { name: "Viper win rate by rank" })).toBeInTheDocument();
    for (const text of ["Ancient", "Divine+", "60.0%", "57.5%", "1,200 matches", "800 matches", "-2.5 pp"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("marks small samples and suppresses the comparison delta", () => {
    render(<RankWinRateComparison sourceName="Viper" minimumSample={500} rates={{
      ancient: { sourceWinRate: 0, sampleSize: 10 }, divinePlus: null
    }} />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText("Small sample")).toBeInTheDocument();
    expect(screen.getByLabelText("Not available")).toBeInTheDocument();
    expect(screen.queryByText("Divine+ difference")).not.toBeInTheDocument();
  });

  it("never substitutes the combined headline for missing rank data", () => {
    render(<RankWinRateComparison sourceName="Viper" minimumSample={500} />);
    expect(screen.getAllByText("No rank data")).toHaveLength(2);
    expect(screen.queryByText(/\d+\.\d+%/)).not.toBeInTheDocument();
  });
});
