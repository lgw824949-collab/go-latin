import CapitalCard from "./CapitalCard.jsx";

export default function CapitalGrid({ capitals }) {
  return (
    <ul className="grid">
      {capitals.map((capital) => (
        <li key={capital.id}>
          <CapitalCard capital={capital} />
        </li>
      ))}
    </ul>
  );
}
