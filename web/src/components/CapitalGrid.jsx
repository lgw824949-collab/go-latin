import CapitalCard from "./CapitalCard.jsx";

export default function CapitalGrid({ capitals, dance }) {
  return (
    <ul className="grid">
      {capitals.map((capital) => (
        <li key={capital.id}>
          <CapitalCard capital={capital} dance={dance} />
        </li>
      ))}
    </ul>
  );
}
