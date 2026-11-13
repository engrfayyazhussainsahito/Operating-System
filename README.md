# Operating Systems for Dummies

> A free, 16-week undergraduate operating systems course where every idea gets an analogy, a precise definition, a worked trace, runnable code, and an interactive model you can poke at.

[![Live Course](https://img.shields.io/badge/Live%20Course-Open%20Now-2ea44f?style=for-the-badge)](https://engrfayyazhussainsahito.github.io/Operating-System/index.html)
[![Weeks](https://img.shields.io/badge/Weeks-16-blue?style=for-the-badge)](https://engrfayyazhussainsahito.github.io/Operating-System/syllabus.html)
[![Text License](https://img.shields.io/badge/Text-CC%20BY%204.0-orange?style=for-the-badge)](https://creativecommons.org/licenses/by/4.0/)
[![Code License](https://img.shields.io/badge/Code-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Live site:** https://engrfayyazhussainsahito.github.io/Operating-System/index.html

---

## About

**Operating Systems for Dummies** is an open course that teaches how operating systems work by letting you *watch them work*. It is built for undergraduate students, self-learners, and anyone preparing for OS exams or technical interviews.

Each week follows the same pattern:

1. **Analogy**: an everyday picture of the idea
2. **Definition**: the precise, exam-ready version
3. **Worked trace**: Gantt charts, page tables, Banker's matrices solved step by step
4. **Runnable code**: C labs for Linux that need only `gcc`
5. **Interactive model**: a simulator or 3D model you can change and break
6. **Exercises with worked solutions**

## Course at a Glance

| | |
|---|---|
| **Weeks** | 16 |
| **Interactive models** | 27 |
| **Figures** | 68 |
| **Exercises (all with solutions)** | 139 |
| **Cost** | Free, no account, no tracking |

## Syllabus

### Phase 1: Foundations
| Week | Topic |
|---|---|
| [1](https://engrfayyazhussainsahito.github.io/Operating-System/week-01.html) | Introduction, OS Structure and System Calls |
| [2](https://engrfayyazhussainsahito.github.io/Operating-System/week-02.html) | Processes |
| [3](https://engrfayyazhussainsahito.github.io/Operating-System/week-03.html) | Threads and Interprocess Communication |
| [4](https://engrfayyazhussainsahito.github.io/Operating-System/week-04.html) | CPU Scheduling |

### Phase 2: Concurrency and Deadlocks
| Week | Topic |
|---|---|
| [5](https://engrfayyazhussainsahito.github.io/Operating-System/week-05.html) | Synchronization I |
| [6](https://engrfayyazhussainsahito.github.io/Operating-System/week-06.html) | Synchronization II |
| [7](https://engrfayyazhussainsahito.github.io/Operating-System/week-07.html) | Deadlocks |

### Phase 3: Memory
| Week | Topic |
|---|---|
| [8](https://engrfayyazhussainsahito.github.io/Operating-System/week-08.html) | Main Memory |
| [9](https://engrfayyazhussainsahito.github.io/Operating-System/week-09.html) | Virtual Memory |
| [10](https://engrfayyazhussainsahito.github.io/Operating-System/week-10.html) | Page Replacement, Frame Allocation and Thrashing |

### Phase 4: Storage, Protection and Modern Systems
| Week | Topic |
|---|---|
| [11](https://engrfayyazhussainsahito.github.io/Operating-System/week-11.html) | Mass Storage: Disks, SSDs, Scheduling and RAID |
| [12](https://engrfayyazhussainsahito.github.io/Operating-System/week-12.html) | File Systems I: Interface and Implementation |
| [13](https://engrfayyazhussainsahito.github.io/Operating-System/week-13.html) | File Systems II: Journaling, Caching and the I/O Subsystem |
| [14](https://engrfayyazhussainsahito.github.io/Operating-System/week-14.html) | Protection and Security |
| [15](https://engrfayyazhussainsahito.github.io/Operating-System/week-15.html) | Virtualization, Containers and Case Studies: Linux and Windows |
| [16](https://engrfayyazhussainsahito.github.io/Operating-System/week-16.html) | Review, Projects and Final Exam |

Also available: [Full Syllabus](https://engrfayyazhussainsahito.github.io/Operating-System/syllabus.html) · [Glossary](https://engrfayyazhussainsahito.github.io/Operating-System/glossary.html) · [About and Contributing](https://engrfayyazhussainsahito.github.io/Operating-System/about.html)

## Topics Covered

- **Core concepts:** system calls, kernel structure, dual-mode operation, booting
- **Processes and threads:** PCB, process states, context switching, `fork`/`exec`/`wait`, POSIX threads, pipes, shared memory, signals
- **CPU scheduling:** FCFS, SJF, Round Robin, multilevel feedback queues, Linux CFS, real-time policies
- **Synchronization:** race conditions, mutexes, semaphores, condition variables, monitors, classic problems (bounded buffer, readers-writers, dining philosophers)
- **Deadlocks:** necessary conditions, resource-allocation graphs, Banker's algorithm, detection and recovery
- **Memory management:** paging, TLBs, multilevel page tables, segmentation, virtual memory, copy-on-write
- **Page replacement:** FIFO, LRU, OPT, Clock, Belady's anomaly, thrashing
- **Storage:** HDDs, SSDs, disk scheduling (FCFS, SSTF, SCAN, LOOK), RAID
- **File systems:** inodes, FAT, VFS, journaling, copy-on-write and log-structured designs, caching, DMA and interrupts
- **Protection and security:** rings, access matrix, ACLs, capabilities, Unix permissions, seccomp, TOCTOU races
- **Modern systems:** hypervisors, containers (namespaces and cgroups), Linux and Windows case studies

## Who Is This For?

- Undergraduate computer science and engineering students
- Self-taught developers filling gaps in systems knowledge
- Instructors looking for open, reusable course material
- Anyone preparing for OS exams or systems interviews

## How to Study This Course

1. **Predict, then press.** Write your answer before running any demo.
2. **Trace on paper.** Gantt charts, page tables and Banker matrices are exam skills, so solve them by hand first.
3. **Run the code.** Labs need only `gcc` on Linux or WSL. Change a line, break it on purpose, read the error.
4. **Look things up.** Press `/` to search. Every glossary term links to the week that defines it.

Progress is saved in your browser only. No account, no tracking.

## Run Locally

```bash
git clone https://github.com/engrfayyazhussainsahito/Operating-System.git
cd Operating-System
```

Open `index.html` in your browser, or serve it locally:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Contributing

Corrections, clearer explanations, and new exercises are welcome. See the [About and Contributing](https://engrfayyazhussainsahito.github.io/Operating-System/about.html) page, or open an issue or pull request.

## License

- **Text and figures:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Code:** [MIT](https://opensource.org/licenses/MIT)

## Author

Maintained by [@engrfayyazhussainsahito](https://github.com/engrfayyazhussainsahito).

If this course helps you, consider giving the repo a star.
