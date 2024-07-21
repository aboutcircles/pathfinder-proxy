import {MethodFilter} from "../src/methodFilter";

describe("MethodFilter", () => {
  it('should allow all whitelisted methods', () => {
    const filter = new MethodFilter({
      "method1": true,
      "method2": true,
      "method3": false
    });

    expect(filter.canPass({
      id: "1",
      method: "method1",
    })).toBe(true);

    expect(filter.canPass({
      id: "2",
      method: "method2",
    })).toBe(true);
  });

  it('should deny all blacklisted methods', () => {
    const filter = new MethodFilter({
      "method1": true,
      "method2": true,
      "method3": false
    });

    expect(filter.canPass({
      id: "1",
      method: "method3",
    })).toBe(false);
  });

  it('should deny all unspecified methods', () => {
    const filter = new MethodFilter({
    });

    expect(filter.canPass({
      id: "1",
      method: "method1",
    })).toBe(false);
  });
});
