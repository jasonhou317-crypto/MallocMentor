from __future__ import annotations

import csv
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
FIG_DIR = ROOT / "figures"


def configure_font() -> None:
    plt.style.use("default")
    # Prefer common CJK fonts on Windows/macOS/Linux; fallback to DejaVu Sans.
    plt.rcParams["font.sans-serif"] = [
        "Microsoft YaHei",
        "Noto Sans CJK SC",
        "SimHei",
        "PingFang SC",
        "WenQuanYi Zen Hei",
        "DejaVu Sans",
    ]
    plt.rcParams["axes.unicode_minus"] = False


def write_csv(path: Path, headers: list[str], rows: list[list[object]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)


def build_performance_chart() -> None:
    labels = ["题目列表查询", "知识列表查询", "代码运行请求", "代码提交评审"]
    avg_ms = np.array([92, 118, 860, 1740])
    p95_ms = np.array([165, 210, 1420, 2860])

    x = np.arange(len(labels))
    width = 0.34

    fig, ax = plt.subplots(figsize=(11, 6.2), dpi=150)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    bars_avg = ax.bar(x - width / 2, avg_ms, width, label="平均耗时 (ms)", color="#3B82F6")
    bars_p95 = ax.bar(x + width / 2, p95_ms, width, label="P95 耗时 (ms)", color="#F59E0B")

    ax.set_title("系统性能结果（模拟数据）：平均耗时与 P95 对比", fontsize=14, pad=12)
    ax.set_xlabel("接口类型")
    ax.set_ylabel("耗时 (ms)")
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.grid(axis="y", linestyle="--", alpha=0.28)
    ax.legend(loc="upper left")

    for bar in list(bars_avg) + list(bars_p95):
        h = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            h + max(12, h * 0.01),
            f"{int(h)}",
            ha="center",
            va="bottom",
            fontsize=9,
        )

    fig.tight_layout()
    out_png = FIG_DIR / "performance-latency-avg-p95.png"
    fig.savefig(out_png, bbox_inches="tight")
    plt.close(fig)

    csv_rows = [[labels[i], int(avg_ms[i]), int(p95_ms[i])] for i in range(len(labels))]
    write_csv(
        FIG_DIR / "simulated_performance_metrics.csv",
        ["endpoint", "avg_ms", "p95_ms"],
        csv_rows,
    )


def build_concurrency_chart() -> None:
    concurrency = np.array([1, 5, 10, 20, 30, 40, 50])
    throughput = np.array([22, 96, 181, 309, 351, 336, 295])
    p99_ms = np.array([95, 132, 190, 320, 540, 860, 1280])
    error_pct = np.array([0.0, 0.0, 0.0, 0.0, 0.3, 1.1, 2.8])

    fig, ax_left = plt.subplots(figsize=(11, 6.4), dpi=150)
    fig.patch.set_facecolor("white")
    ax_left.set_facecolor("white")
    ax_p99 = ax_left.twinx()
    ax_err = ax_left.twinx()
    ax_p99.set_facecolor("none")
    ax_err.set_facecolor("none")
    ax_err.spines["right"].set_position(("axes", 1.11))

    ln1 = ax_left.plot(
        concurrency,
        throughput,
        marker="o",
        linewidth=2.2,
        color="#2563EB",
        label="吞吐 (req/s)",
    )
    ln2 = ax_p99.plot(
        concurrency,
        p99_ms,
        marker="s",
        linewidth=2.2,
        color="#F97316",
        label="P99 延迟 (ms)",
    )
    ln3 = ax_err.plot(
        concurrency,
        error_pct,
        marker="^",
        linewidth=2.2,
        color="#DC2626",
        label="错误率 (%)",
    )

    ax_left.set_title("并发压测结果（模拟数据）：并发-吞吐-错误率-P99 关系", fontsize=14, pad=12)
    ax_left.set_xlabel("并发数")
    ax_left.set_ylabel("吞吐 (req/s)", color="#2563EB")
    ax_p99.set_ylabel("P99 延迟 (ms)", color="#F97316")
    ax_err.set_ylabel("错误率 (%)", color="#DC2626")

    ax_left.tick_params(axis="y", colors="#2563EB")
    ax_p99.tick_params(axis="y", colors="#F97316")
    ax_err.tick_params(axis="y", colors="#DC2626")

    ax_left.set_xticks(concurrency)
    ax_left.grid(axis="both", linestyle="--", alpha=0.26)

    all_lines = ln1 + ln2 + ln3
    labels = [line.get_label() for line in all_lines]
    ax_left.legend(all_lines, labels, loc="upper left")

    fig.tight_layout()
    out_png = FIG_DIR / "concurrency-stress-metrics.png"
    fig.savefig(out_png, bbox_inches="tight")
    plt.close(fig)

    csv_rows = [
        [int(concurrency[i]), int(throughput[i]), int(p99_ms[i]), float(error_pct[i])]
        for i in range(len(concurrency))
    ]
    write_csv(
        FIG_DIR / "simulated_concurrency_metrics.csv",
        ["concurrency", "throughput_rps", "p99_ms", "error_rate_pct"],
        csv_rows,
    )


def print_quick_assessment() -> None:
    print("[模拟评估] 代码运行与代码提交评审的 P95 显著高于本地查询接口，符合外部依赖场景。")
    print("[模拟评估] 并发 30 左右达到吞吐峰值，继续加压后错误率与 P99 上升，存在饱和拐点。")
    print("[模拟评估] 适合作为论文演示初版；后续可直接改脚本中的数组并重新生成图与 CSV。")


def main() -> None:
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    configure_font()
    build_performance_chart()
    build_concurrency_chart()
    print_quick_assessment()


if __name__ == "__main__":
    main()
