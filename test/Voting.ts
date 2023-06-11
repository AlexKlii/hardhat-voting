import { Voting } from "../typechain-types";
import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe("Voting beforeEach", () => {
    let voting: Voting;
    let owner: HardhatEthersSigner;
    let secondAccount: HardhatEthersSigner;
    let thirdAccount: HardhatEthersSigner;

    async function getVoting(): Promise<Voting> {
        const Voting = await ethers.getContractFactory("Voting");
        [owner, secondAccount, thirdAccount] = await ethers.getSigners();

        return await Voting.connect(owner).deploy();
    }

    beforeEach(async () => {
        voting = await getVoting();
    });

    describe("Deployment", () => {
        it("Should set the right owner", async () => {
            expect(await voting.owner()).to.be.equal(owner.address);
        });
    
        it("Workflow status should be 0", async () => {
            expect(await voting.workflowStatus()).to.be.equal(0);
        });

        it("WinningProposalId should be 0", async () => {
            expect(await voting.winningProposalID()).to.be.equal(0);
        });
    });

    describe("Revert if caller is not the owner", () => {
        it("Revert from addVoter", async () => {
            await expect(voting.connect(secondAccount).addVoter(secondAccount.address)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Revert from starting proposal registration.", async () => {
            await expect(voting.connect(secondAccount).startProposalsRegistering()).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Revert from endProposalsRegistering", async () => {
            await expect(voting.connect(secondAccount).endProposalsRegistering()).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Revert from startVotingSession", async () => {
            await expect(voting.connect(secondAccount).startVotingSession()).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Revert from endVotingSession", async () => {
            await expect(voting.connect(secondAccount).endVotingSession()).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Revert from tallyVotes", async () => {
            await expect(voting.connect(secondAccount).tallyVotes()).to.be.revertedWith("Ownable: caller is not the owner");
        });

    });

    describe("Revert if caller is a unregistered voters", () => {
        it("Revert from getVoter", async () => {
            await expect(voting.getVoter(secondAccount.address)).to.be.revertedWith("You're not a voter");
        });

        it("Revert from getOneProposal", async () => {
            await expect(voting.getOneProposal(420)).to.be.revertedWith("You're not a voter");
        });

        it("Revert from addProposal", async () => {
            await expect(voting.connect(secondAccount).addProposal("My reverted proposal")) .to.be.revertedWith("You're not a voter");
        });

        it("Revert from setVote", async () => {
            await expect(voting.connect(secondAccount).setVote(0)).to.be.revertedWith("You're not a voter");
        });
    });

    describe("RegisteringVoters", () => {
        it("WorkflowStatusChange 0->1", async () => {
            await expect(voting.startProposalsRegistering()).to.emit(voting, "WorkflowStatusChange").withArgs(0, 1);

            await expect(voting.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now");
            //     await expect(voting.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet");
            await expect(voting.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished");
            await expect(voting.endVotingSession()).to.be.revertedWith("Voting session havent started yet");
            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
        });

        it("addVoter", async () => {
            await expect(voting.addVoter(secondAccount.address)).to.emit(voting, "VoterRegistered").withArgs(secondAccount.address);
        });

        it("Revert if voter already registered", async () => {
            await voting.addVoter(secondAccount.address);
            await expect(voting.addVoter(secondAccount.address)).to.be.revertedWith("Already registered");
        });
    });

    describe("ProposalsRegistrationStarted", () => {
        beforeEach(async () => {
            voting = await getVoting();
            await voting.addVoter(secondAccount.address);
            await voting.startProposalsRegistering();
        });

        it("WorkflowStatusChange 1->2", async () => {
            await expect(voting.endProposalsRegistering()).to.emit(voting, "WorkflowStatusChange").withArgs(1, 2);

            await expect(voting.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now");
            await expect(voting.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet");
            // await expect(voting.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished");
            await expect(voting.endVotingSession()).to.be.revertedWith("Voting session havent started yet");
            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
            
        });

        it("Revert addVoter", async () => {
            await expect(voting.addVoter(secondAccount.address)).to.be.revertedWith("Voters registration is not open yet");
        });

        it("Voter add a proposal", async () => {
            await expect(voting.connect(secondAccount).addProposal("The best proposal ever")).to.emit(voting, "ProposalRegistered").withArgs(1);
        });

        it("Revert if empty proposal added", async () => {
            await expect(voting.connect(secondAccount).addProposal("")).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
        });

    });

    describe("ProposalsRegistrationEnded", () => {
        beforeEach(async () => {
            voting = await getVoting();
            await voting.addVoter(secondAccount.address);
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
        });

        it("WorkflowStatusChange 2->3", async () => {
            await expect(voting.startVotingSession()).to.emit(voting, "WorkflowStatusChange").withArgs(2, 3);

            await expect(voting.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now");
            await expect(voting.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet");
            await expect(voting.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished");
            // await expect(voting.endVotingSession()).to.be.revertedWith("Voting session havent started yet");
            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
            
        });

        it("Revert addProposal", async () => {
            await expect(voting.connect(secondAccount).addProposal("My reverted proposal")).to.be.revertedWith("Proposals are not allowed yet");
        });
    });

    describe("VotingSessionStarted", () => {
        beforeEach(async () => {
            voting = await getVoting();
            await voting.addVoter(secondAccount.address);
            await voting.startProposalsRegistering();
            await voting.connect(secondAccount).addProposal("My proposal")
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
        });

        it("WorkflowStatusChange 3->4", async () => {
            await expect(voting.endVotingSession()).to.emit(voting, "WorkflowStatusChange").withArgs(3, 4);

            await expect(voting.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now");
            await expect(voting.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet");
            await expect(voting.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished");
            await expect(voting.endVotingSession()).to.be.revertedWith("Voting session havent started yet");
            // await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
            
        });

        it("Vote for a proposals", async () => {
            await expect(voting.connect(secondAccount).setVote(0)).to.emit(voting, "Voted").withArgs(secondAccount.address, 0);
        });

        it("Revert if already voted", async () => {
            await voting.connect(secondAccount).setVote(0);
            await expect(voting.connect(secondAccount).setVote(1)).to.be.revertedWith("You have already voted");
        });

        it("Revert if proposal not found", async () => {
            await expect(voting.connect(secondAccount).setVote(420)).to.be.revertedWith("Proposal not found");
        });
    });

    describe("VotingSessionEnded", () => {
        beforeEach(async () => {
            voting = await getVoting();
            await voting.addVoter(secondAccount.address);
            await voting.addVoter(thirdAccount.address);
            await voting.startProposalsRegistering();
            await voting.connect(secondAccount).addProposal("The best proposal ever")
            await voting.connect(thirdAccount).addProposal("Another proposal")
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await voting.connect(secondAccount).setVote(1);
            await voting.endVotingSession();
        });

        it("Revert setVote", async () => {
            await expect(voting.connect(secondAccount).setVote(1)).to.be.revertedWith("Voting session havent started yet");
        });

        it("Has voted", async () => {
            const voter = await voting.connect(secondAccount).getVoter(secondAccount.address);

            expect(voter.isRegistered).to.be.true;
            expect(voter.hasVoted).to.be.true;
            expect(voter.votedProposalId).to.be.equal(1);
        });

        it("Has not voted", async () => {
            const voter = await voting.connect(secondAccount).getVoter(thirdAccount.address);

            expect(voter.isRegistered).to.be.true;
            expect(voter.hasVoted).to.be.false;
            expect(voter.votedProposalId).to.be.equal(0);
        });

        it("Registered voter can get a proposal", async () => {
            const proposal = await voting.connect(secondAccount).getOneProposal(0);
            const otherProposal = await voting.connect(secondAccount).getOneProposal(1);
            const thirdProposal = await voting.connect(secondAccount).getOneProposal(2);

            expect(proposal.description).to.be.equal("GENESIS");
            expect(proposal.voteCount).to.be.equal(0);

            expect(otherProposal.description).to.be.equal("The best proposal ever");
            expect(otherProposal.voteCount).to.be.equal(1);

            expect(thirdProposal.description).to.be.equal("Another proposal");
            expect(thirdProposal.voteCount).to.be.equal(0);
        });
        
        it("WorkflowStatusChange 4->5", async () => {
            await expect(voting.tallyVotes()).to.emit(voting, "WorkflowStatusChange").withArgs(4, 5);

            await expect(voting.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now");
            await expect(voting.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet");
            await expect(voting.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished");
            await expect(voting.endVotingSession()).to.be.revertedWith("Voting session havent started yet");
            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
        });
    });
});